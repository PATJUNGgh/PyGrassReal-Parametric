
export function sdSphere(x: number, y: number, z: number, r: number): number {
    return Math.sqrt(x * x + y * y + z * z) - r;
}

export function sdBox(x: number, y: number, z: number, bx: number, by: number, bz: number): number {
    const qx = Math.abs(x) - bx;
    const qy = Math.abs(y) - by;
    const qz = Math.abs(z) - bz;

    const outX = Math.max(qx, 0);
    const outY = Math.max(qy, 0);
    const outZ = Math.max(qz, 0);

    const distOut = Math.sqrt(outX * outX + outY * outY + outZ * outZ);
    const distIn = Math.min(Math.max(qx, Math.max(qy, qz)), 0);

    return distOut + distIn;
}

export function sdRoundedBox(x: number, y: number, z: number, bx: number, by: number, bz: number, r: number): number {
    return sdBox(x, y, z, bx - r, by - r, bz - r) - r;
}

// Polynomial smooth min (k = 0.1);
export function smin(a: number, b: number, k: number): number {
    const h = Math.max(k - Math.abs(a - b), 0.0) / k;
    return Math.min(a, b) - h * h * k * 0.25;
}

// Polynomial smooth max (for intersection and subtraction)
export function smax(a: number, b: number, k: number): number {
    const h = Math.max(k - Math.abs(a - b), 0.0) / k;
    return Math.max(a, b) + h * h * k * 0.25;
}
