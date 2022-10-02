// @ts-nocheck
"use strict";

const reverseKeys = (obj) => {
    const newObj = {};

    Object.keys(obj).forEach(k => {
        newObj[obj[k]] = k;
    });

    return newObj;
}
(async () => {
    const { unpack } = await import("https://cdn.skypack.dev/msgpackr");
    const { default: fuzzy } = await import(
        "https://cdn.skypack.dev/closest-match"
    );
    const { ungzip } = await import('https://cdn.skypack.dev/pako');

    const chunkSize = 25000;

    //const workers = Array.from({ length: 4 }).map(() => new Worker('./similarity_worker.js'));

    const gzippedFn = name => fetch(`./kjv_1/${name}.gz`)
        .then(r => r.arrayBuffer())
        .then((
            a,
        ) => new Uint8Array(a))
        .then(r => ungzip(r))
        .then(unpack)
        .then(reverseKeys);

    const createHandlers = () => {

        const dicts = new Map();

        const loadDict = async ({ name }) => {
            return dicts.get(name) !== undefined
                ? "already-loaded"
                : await gzippedFn(name)
                    .then((d) => {
                        dicts.set(name, d);
                        const keys = Object.keys(d);
                        //workers.forEach((w, i) => {
                        //    w.postMessage({data: keys.slice(i * chunkSize, (i * chunkSize) + chunkSize), dict: name, type: "addData"})
                        //});
                    })
                    .then(_ => "success")
                    .catch(e => {
                        dicts.set(name, null);
                        console.error(e);
                        return e;
                    });
        };

        const findMatch2 = async ({ query, dict }) => {

            return (await Promise.all(workers.map(async w => {
                w.postMessage({ query, dict, type: "findMatch" });
                return new Promise(resolve => {
                    w.onmessage = e => {
                        resolve(e.data) // a string[]
                    }
                });
            }))).reduce((a, b) => a.concat(b), []).map(word => `${word} ➤ ${dicts.get(dict)[word]}`);
        }

        const findMatch = async ({ query, dict }) => {

            return fuzzy.closestMatch(query.toLowerCase(), Object.keys(dicts.get(dict))
                .slice(0, 75000), true)
                .map(word => [
                    word, 
                    (() => {
                        let html = ``;
                        const arr = Array.from(dicts.keys())
                            .map(k => ({ language: k, word: dicts.get(k)[word] }))
                            .filter(k => k.word !== undefined);
                        for (const subtrans of arr) {
                            html += `
                            <p>
                            <span class="tag is-small">${subtrans.language}</span>
                            ${subtrans.word}
                            </p>`
                        }
                        return html;
                    })()
                ]);
        }

        return { loadDict, findMatch };
    };

    const handlers = createHandlers();

    onmessage = async (e) => {
        postMessage(await handlers[e.data.type](e.data));
    };

    console.log("Ready");
})();
