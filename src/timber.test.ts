import { expect, setDefaultTimeout, test } from "bun:test";
import { cube } from "@dylanebert/shallot";
import { TIMEOUT } from "@dylanebert/shallot/testing";
import { timberGeometry } from "./timber";
setDefaultTimeout(TIMEOUT.cheap);
for (const size of [[.7,.4,.4], [.1,.17,.1], [1.5,.2,.65]])
    test(`timber ${size} has complete face patches with grain along each long axis`, () => {
        const mesh = timberGeometry(size), base = cube();
        expect(mesh.indices).toEqual(base.indices);
        for (let face = 0; face < 6; face++) {
            const start = face * 4 * 8;
            const corners = new Set<string>();
            for (let vertex = 0; vertex < 4; vertex++) {
                const i = start + vertex * 8;
                expect(mesh.vertices.slice(i, i + 3)).toEqual(base.vertices.slice(i, i + 3));
                expect(mesh.vertices.slice(i + 4, i + 7)).toEqual(base.vertices.slice(i + 4, i + 7));
                corners.add(`${mesh.vertices[i + 3]},${mesh.vertices[i + 7]}`);
                const normal = [0,1,2].find(axis => Math.abs(mesh.vertices[i + 4 + axis]) > .5)!;
                const plane = [0,1,2].filter(axis => axis !== normal);
                const along = size[plane[0]] >= size[plane[1]] ? plane[0] : plane[1];
                expect(mesh.vertices[i + 7]).toBe(mesh.vertices[i + along] + .5);
            }
            expect([...corners].sort()).toEqual(["0,0", "0,1", "1,0", "1,1"]);
        }
    });
