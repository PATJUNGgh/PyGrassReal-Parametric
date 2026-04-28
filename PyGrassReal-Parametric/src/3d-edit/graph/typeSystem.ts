export enum PortDataType {
    Number = 'Number',
    Vector3 = 'Vector3',
    Mesh = 'Mesh',
    Curve = 'Curve',
    Boolean = 'Boolean',
    Text = 'Text',
    Material = 'Material',
    Any = 'Any',
}

const PORT_COLOR_MAP: Record<PortDataType, string> = {
    [PortDataType.Number]: '#0ea5e9',
    [PortDataType.Vector3]: '#22c55e',
    [PortDataType.Mesh]: '#f97316',
    [PortDataType.Curve]: '#a855f7',
    [PortDataType.Boolean]: '#10b981',
    [PortDataType.Text]: '#22d3ee',
    [PortDataType.Material]: '#f59e0b',
    [PortDataType.Any]: '#9ca3af',
};

const TYPE_ALIASES: Record<string, PortDataType> = {
    any: PortDataType.Any,
    bool: PortDataType.Boolean,
    boolean: PortDataType.Boolean,
    curve: PortDataType.Curve,
    float: PortDataType.Number,
    int: PortDataType.Number,
    material: PortDataType.Material,
    mesh: PortDataType.Mesh,
    number: PortDataType.Number,
    string: PortDataType.Text,
    text: PortDataType.Text,
    vector: PortDataType.Vector3,
    vector3: PortDataType.Vector3,
};

const COMPATIBILITY_TABLE: Record<PortDataType, ReadonlySet<PortDataType>> = {
    [PortDataType.Number]: new Set([PortDataType.Number]),
    [PortDataType.Vector3]: new Set([PortDataType.Vector3]),
    [PortDataType.Mesh]: new Set([PortDataType.Mesh]),
    [PortDataType.Curve]: new Set([PortDataType.Curve]),
    [PortDataType.Boolean]: new Set([PortDataType.Boolean]),
    [PortDataType.Text]: new Set([PortDataType.Text]),
    [PortDataType.Material]: new Set([PortDataType.Material]),
    [PortDataType.Any]: new Set([
        PortDataType.Number,
        PortDataType.Vector3,
        PortDataType.Mesh,
        PortDataType.Curve,
        PortDataType.Boolean,
        PortDataType.Text,
        PortDataType.Material,
        PortDataType.Any,
    ]),
};

const normalizePortDataType = (type: PortDataType | string | undefined): PortDataType | null => {
    if (!type) {
        return null;
    }
    if (typeof type !== 'string') {
        return type;
    }
    return TYPE_ALIASES[type.trim().toLowerCase()] ?? null;
};

export const isTypeCompatible = (
    source: PortDataType | string | undefined,
    target: PortDataType | string | undefined
): boolean => {
    const normalizedSource = normalizePortDataType(source);
    const normalizedTarget = normalizePortDataType(target);

    if (!normalizedSource || !normalizedTarget) {
        return false;
    }
    if (normalizedSource === PortDataType.Any || normalizedTarget === PortDataType.Any) {
        return true;
    }

    return COMPATIBILITY_TABLE[normalizedSource].has(normalizedTarget);
};

export const getPortColor = (type: PortDataType | string | undefined): string => {
    const normalizedType = normalizePortDataType(type);
    if (!normalizedType) {
        return PORT_COLOR_MAP[PortDataType.Any];
    }
    return PORT_COLOR_MAP[normalizedType];
};
