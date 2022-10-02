// @ts-nocheck
"use strict";

const reverseKeys = (obj) => {
    const newObj = {};

    Object.keys(obj).forEach(k => {
        newObj[obj[k]] = k;
    });

    return newObj;
}

function hasNumber(myString) {
    return /\d/.test(myString);
  }

(async () => {
    const { unpack } = await import("https://cdn.skypack.dev/msgpackr");
    const { default: fuzzy } = await import(
        "https://cdn.skypack.dev/closest-match"
    );
    const { ungzip } = await import('https://cdn.skypack.dev/pako');


    //const workers = Array.from({ length: 4 }).map(() => new Worker('./similarity_worker.js'));

    const gzippedFn = name => fetch(`./dictionaries_n5_75k/${name}.gz`)
        .then(r => r.arrayBuffer())
        .then((
            a,
        ) => new Uint8Array(a))
        .then(r => ungzip(r))
        .then(unpack);
        //.then(reverseKeys);

    const createHandlers = () => {

        const dicts = new Map();

        const loadDict = async ({ name }) => {
            return dicts.get(name) !== undefined
                ? "already-loaded"
                : await gzippedFn(name)
                    .then((d) => {
                        const newMap = new Map();
                        Array.from(Object.keys(d)).forEach(k => {
                            if (!hasNumber(d[k]) && d[k].length > 0) {
                                newMap.set(k, d[k]);
                            }
                        });
                        dicts.set(name, newMap);
                        //const keys = Object.keys(d);
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


        const findMatch = async ({ query, dict }) => {

            return fuzzy.closestMatch(query.toLowerCase(), Array.from(dicts.get(dict).keys())
                .slice(0, 50000), true)
                .concat(fuzzy.closestMatch(query.toLowerCase(), Array.from(dicts.get(dict).keys())
                .slice(50000, 100000), true))
                .map(word => [
                    word, 
                    (() => {
                        let html = ``;
                        const arr = Array.from(dicts.keys())
                            .map(k => ({ language: k, word: dicts.get(k).get(word) }))
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
