
// SDF Utils copied from src/utils/sdfUtils.ts
function sdSphere(x, y, z, r) {
    return Math.sqrt(x * x + y * y + z * z) - r;
}

function sdBox(x, y, z, bx, by, bz) {
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

// Polynomial smooth max (for intersection and subtraction)
function smax(a, b, k) {
    const h = Math.max(k - Math.abs(a - b), 0.0) / k;
    return Math.max(a, b) + h * h * k * 0.25;
}

// Test Case
const smoothness = 0.5;

console.log('Testing Mesh Difference Logic (A - B)...');
console.log('A: Box (size 1, half-extents 0.5)');
console.log('B: Sphere (radius 0.5)');
console.log('Operation: smax(distA, -distB, k)\n');

const points = [
    { name: 'Center', x: 0, y: 0, z: 0 },
    { name: 'Inside Box, Outside Sphere', x: 0.45, y: 0.45, z: 0.45 }, // Corner of box
    { name: 'Outside Box, Outside Sphere', x: 1, y: 1, z: 1 },
    { name: 'Edge of Sphere', x: 0.5, y: 0, z: 0 }
];

points.forEach(p => {
    const distA = sdBox(p.x, p.y, p.z, 0.5, 0.5, 0.5);
    const distB = sdSphere(p.x, p.y, p.z, 0.5);
    
    // Difference: A - B => Intersection(A, Not B)
    // Not B => -distB
    // Intersection => smax
    const res = smax(distA, -distB, smoothness);
    
    console.log(`Point: ${p.name} (${p.x}, ${p.y}, ${p.z})`);
    console.log(`  distA (Box): ${distA.toFixed(4)}`);
    console.log(`  distB (Sphere): ${distB.toFixed(4)}`);
    console.log(`  -distB: ${(-distB).toFixed(4)}`);
    console.log(`  Result (smax): ${res.toFixed(4)}`);
    console.log(`  Inside? ${res < 0 ? 'YES' : 'NO'}`);
    console.log('---');
});
