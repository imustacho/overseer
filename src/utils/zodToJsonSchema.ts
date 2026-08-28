import type { z } from 'zod';

export function zodToJsonSchema(schema: z.ZodType): Record<string, unknown> {
    return processZodType(schema);
}

function processZodType(schema: z.ZodType): Record<string, unknown> {
    const typeName = (schema._def as any).typeName as string;

    switch (typeName) {
        case 'ZodObject':
            return processObject(schema as z.ZodObject<z.ZodRawShape>);
        case 'ZodString':
            return processString(schema as z.ZodString);
        case 'ZodNumber':
            return processNumber(schema as z.ZodNumber);
        case 'ZodBoolean':
            return { type: 'boolean', ...getDescription(schema) };
        case 'ZodEnum':
            return processEnum(schema as z.ZodEnum<[string, ...string[]]>);
        case 'ZodOptional':
            return processZodType((schema as z.ZodOptional<z.ZodType>)._def.innerType);
        case 'ZodDefault':
            return processZodType((schema as z.ZodDefault<z.ZodType>)._def.innerType);
        case 'ZodArray':
            return processArray(schema as z.ZodArray<z.ZodType>);
        case 'ZodNullable':
            return { ...processZodType((schema as z.ZodNullable<z.ZodType>)._def.innerType), nullable: true };
        default:
            return { type: 'string', ...getDescription(schema) };
    }
}

function processObject(schema: z.ZodObject<z.ZodRawShape>): Record<string, unknown> {
    const shape = schema._def.shape();
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
        const zodValue = value as z.ZodType;
        properties[key] = processZodType(zodValue);

        if (!isOptional(zodValue)) {
            required.push(key);
        }
    }

    const result: Record<string, unknown> = {
        type: 'object',
        properties,
    };

    if (required.length > 0) {
        result.required = required;
    }

    const desc = getDescription(schema);
    if (desc.description) {
        result.description = desc.description;
    }

    return result;
}

function processString(schema: z.ZodString): Record<string, unknown> {
    const result: Record<string, unknown> = { type: 'string', ...getDescription(schema) };

    for (const check of schema._def.checks) {
        if (check.kind === 'min') result.minLength = check.value;
        if (check.kind === 'max') result.maxLength = check.value;
    }

    return result;
}

function processNumber(schema: z.ZodNumber): Record<string, unknown> {
    const result: Record<string, unknown> = { type: 'number', ...getDescription(schema) };

    for (const check of schema._def.checks) {
        if (check.kind === 'min') result.minimum = check.value;
        if (check.kind === 'max') result.maximum = check.value;
        if (check.kind === 'int') result.type = 'integer';
    }

    return result;
}

function processEnum(schema: z.ZodEnum<[string, ...string[]]>): Record<string, unknown> {
    return {
        type: 'string',
        enum: schema._def.values,
        ...getDescription(schema),
    };
}

function processArray(schema: z.ZodArray<z.ZodType>): Record<string, unknown> {
    return {
        type: 'array',
        items: processZodType(schema._def.type),
        ...getDescription(schema),
    };
}

function isOptional(schema: z.ZodType): boolean {
    const typeName = (schema._def as any).typeName as string;
    return typeName === 'ZodOptional' || typeName === 'ZodDefault';
}

function getDescription(schema: z.ZodType): { description?: string } {
    const desc = schema._def.description as string | undefined;
    return desc ? { description: desc } : {};
}
