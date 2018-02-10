/**
 * @fileoverview Rule to disallow empty functions.
 * @author Toru Nagashima
 */

"use strict";

//------------------------------------------------------------------------------
// Helpers
//------------------------------------------------------------------------------

const ALLOW_OPTIONS = Object.freeze([
    "functions",
    "arrowFunctions",
    "generatorFunctions",
    "methods",
    "generatorMethods",
    "getters",
    "setters",
    "constructors"
]);
const SHOW_KIND = Object.freeze({
    functions: "function",
    arrowFunctions: "arrow function",
    generatorFunctions: "generator function",
    asyncFunctions: "async function",
    methods: "method",
    generatorMethods: "generator method",
    asyncMethods: "async method",
    getters: "getter",
    setters: "setter",
    constructors: "constructor"
});

/**
 * Gets the kind of a given function node.
 *
 * @param {ASTNode} node - A function node to get. This is one of
 *      an ArrowFunctionExpression, a FunctionDeclaration, or a
 *      FunctionExpression.
 * @returns {string} The kind of the function. This is one of "functions",
 *      "arrowFunctions", "generatorFunctions", "asyncFunctions", "methods",
 *      "generatorMethods", "asyncMethods", "getters", "setters", and
 *      "constructors".
 */
function getKind(node) {
    const parent = node.parent;
    let kind = "";

    if (node.type === "ArrowFunctionExpression") {
        return "arrowFunctions";
    }

    // Detects main kind.
    if (parent.type === "Property") {
        if (parent.kind === "get") {
            return "getters";
        }
        if (parent.kind === "set") {
            return "setters";
        }
        kind = parent.method ? "methods" : "functions";

    } else if (parent.type === "MethodDefinition") {
        if (parent.kind === "get") {
            return "getters";
        }
        if (parent.kind === "set") {
            return "setters";
        }
        if (parent.kind === "constructor") {
            return "constructors";
        }
        kind = "methods";

    } else {
        kind = "functions";
    }

    // Detects prefix.
    let prefix = "";

    if (node.generator) {
        prefix = "generator";
    } else if (node.async) {
        prefix = "async";
    } else {
        return kind;
    }
    return prefix + kind[0].toUpperCase() + kind.slice(1);
}

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

module.exports = {
    meta: {
        docs: {
            description: "disallow empty functions",
            category: "Best Practices",
            recommended: false
        },

        schema: [
            {
                type: "object",
                properties: {
                    allow: {
                        type: "array",
                        items: {enum: ALLOW_OPTIONS},
                        uniqueItems: true
                    }
                },
                additionalProperties: false
            }
        ]
    },

    create: function(context) {
        const options = context.options[0] || {};
        const allowed = options.allow || [];

        const sourceCode = context.getSourceCode();

        /**
         * Reports a given function node if the node matches the following patterns.
         *
         * - Not allowed by options.
         * - The body is empty.
         * - The body doesn't have any comments.
         *
         * @param {ASTNode} node - A function node to report. This is one of
         *      an ArrowFunctionExpression, a FunctionDeclaration, or a
         *      FunctionExpression.
         * @returns {void}
         */
        function reportIfEmpty(node) {
            const kind = getKind(node);

            if (allowed.indexOf(kind) === -1 &&
                node.body.type === "BlockStatement" &&
                node.body.body.length === 0 &&
                sourceCode.getComments(node.body).trailing.length === 0
            ) {
                context.report({
                    node: node,
                    loc: node.body.loc.start,
                    message: "Unexpected empty " + SHOW_KIND[kind] + "."
                });
            }
        }

        return {
            ArrowFunctionExpression: reportIfEmpty,
            FunctionDeclaration: reportIfEmpty,
            FunctionExpression: reportIfEmpty
        };
    }
};
