import { shallot } from "@dylanebert/shallot/vite";

export default {
    plugins: [shallot()],
    // The capture subject drives the same composed game on a built, stepped page.
    build: { rolldownOptions: { input: ["index.html", "tests/stepped.html"] } },
};
