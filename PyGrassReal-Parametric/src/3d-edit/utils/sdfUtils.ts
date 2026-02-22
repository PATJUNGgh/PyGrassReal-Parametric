
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

export function sdCappedCylinder(x: number, y: number, z: number, r: number, halfHeight: number): number {
    const radialDistance = Math.sqrt(x * x + z * z) - r;
    const verticalDistance = Math.abs(y) - halfHeight;

    const outsideRadial = Math.max(radialDistance, 0);
    const outsideVertical = Math.max(verticalDistance, 0);
    const outsideDistance = Math.sqrt(outsideRadial * outsideRadial + outsideVertical * outsideVertical);
    const insideDistance = Math.min(Math.max(radialDistance, verticalDistance), 0);

    return outsideDistance + insideDistance;
}

export function sdRoundedCylinder(x: number, y: number, z: number, r: number, halfHeight: number, corner: number): number {
    const clampedCorner = Math.max(0, Math.min(corner, Math.min(r, halfHeight)));
    if (clampedCorner <= 0) {
        return sdCappedCylinder(x, y, z, r, halfHeight);
    }

    return sdCappedCylinder(
        x,
        y,
        z,
        Math.max(r - clampedCorner, 0),
        Math.max(halfHeight - clampedCorner, 0)
    ) - clampedCorner;
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

// Polynomial smooth max (for intersection and subtraction)

export function sdCone(x: number, y: number, z: number, sinA: number, cosA: number, height: number): number {
    const pxz = Math.sqrt(x * x + z * z);
    const q_vec_cone = { x: pxz, y: y }; // Assuming base at y=0
    const v_vec_cone = { x: sinA, y: cosA }; // This is normalize(r,h) for the formula

    const d_inf_cone = (q_vec_cone.x * v_vec_cone.x) - (q_vec_cone.y * v_vec_cone.y);
    const final_dist = Math.max(d_inf_cone, -q_vec_cone.y); // Capped by base (y=0)

    const d_tip_plane = q_vec_cone.y - height;

    return Math.max(final_dist, d_tip_plane);
}
