import { cube } from "@dylanebert/shallot";

/** Each face has a complete 0..1 wood patch; UV y follows the longest in-plane axis. */
export function timberGeometry(size: readonly number[]) {
    const mesh = cube();
    for (let i = 0; i < mesh.vertices.length; i += 8) {
        const normal = [0,1,2].find(axis => Math.abs(mesh.vertices[i + 4 + axis]) > .5)!;
        const plane = [0,1,2].filter(axis => axis !== normal);
        const along = size[plane[0]] >= size[plane[1]] ? plane[0] : plane[1];
        const across = plane.find(axis => axis !== along)!;
        mesh.vertices[i + 3] = mesh.vertices[i + across] + .5;
        mesh.vertices[i + 7] = mesh.vertices[i + along] + .5;
    }
    return mesh;
}
