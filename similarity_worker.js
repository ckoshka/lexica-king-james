// @ts-nocheck
"use strict";

(async () => {
    const { default: fuzzy } = await import(
        "https://cdn.skypack.dev/closest-match"
    );

    let dicts = new Map();

    const createHandlers = () => {

        const findMatch = ({ query, dict }) => {
            const closest = fuzzy.closestMatch(query.toLowerCase(), dicts.get(dict).slice(0, 50000), true);
            if (closest) {
                return closest;
            } else {
                return [];
            }
        }

        // dict: string
        // data: string[]
        const addData = ({ data, dict }) => {
            dicts = new Map();
            dicts.set(dict, data);
        }

        return { findMatch, addData };
    };

    const handlers = createHandlers();

    onmessage = async (e) => {
        postMessage(await handlers[e.data.type](e.data));
    };

    console.log("Ready");
})();
