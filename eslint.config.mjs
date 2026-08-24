import js from "@eslint/js";
export default [
    js.configs.recommended,
    {
        ignores: [
            "**/dist/**",
            "**/node_modules/**",
            "**/venv/**",
            "**/coverage/**",
            "**/.next/**",
            "**/build/**",
            "pnpm-lock.yaml"
        ]
    },
    {
        // webpack.config.js files are CommonJS Node scripts — allow require/module/exports
        files: ["**/webpack.config.js"],
        languageOptions: {
            globals: {
                require: "readonly",
                module: "writable",
                exports: "writable",
                __dirname: "readonly",
                __filename: "readonly",
                process: "readonly"
            }
        },
        rules: {
            // webpack config receives 'webpack' arg but doesn't always use it — allow
            "no-unused-vars": ["error", { "args": "none" }]
        }
    }
];

