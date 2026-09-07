/* eslint-disable @typescript-eslint/no-require-imports -- Turbopack loads custom loaders as CommonJS. */
const babel = require("@babel/core");
const locatorModule = require("@locator/babel-jsx");
const locatorPlugin = locatorModule.default || locatorModule;

function windowsSafeLocatorPlugin(babelApi) {
  const types = babelApi.types;
  const plugin = locatorPlugin(babelApi);
  const programVisitor = plugin.visitor.Program;

  function addLegacyLocatorIds(programPath) {
    let expressionId = 0;

    programPath.traverse({
      JSXElement(elementPath) {
        const attributes = elementPath.node.openingElement.attributes;
        const pathAttribute = attributes.find(
          (attribute) =>
            types.isJSXAttribute(attribute) &&
            types.isJSXIdentifier(attribute.name, { name: "data-locatorjs" })
        );
        const alreadyHasLegacyId = attributes.some(
          (attribute) =>
            types.isJSXAttribute(attribute) &&
            types.isJSXIdentifier(attribute.name, { name: "data-locatorjs-id" })
        );

        if (
          !pathAttribute ||
          alreadyHasLegacyId ||
          !types.isJSXExpressionContainer(pathAttribute.value) ||
          !types.isStringLiteral(pathAttribute.value.expression)
        ) {
          return;
        }

        const dataPath = pathAttribute.value.expression.value;
        const lastColon = dataPath.lastIndexOf(":");
        const secondLastColon = dataPath.lastIndexOf(":", lastColon - 1);
        const fullPath = dataPath.slice(0, secondLastColon);

        attributes.push(
          types.jSXAttribute(
            types.jSXIdentifier("data-locatorjs-id"),
            types.jSXExpressionContainer(
              types.stringLiteral(`${fullPath}::${expressionId}`)
            )
          )
        );
        expressionId += 1;
      },
    });
  }

  return {
    ...plugin,
    visitor: {
      ...plugin.visitor,
      Program: {
        enter(path, state) {
          state.filename = state.filename.replaceAll("\\", "/");
          state.cwd = state.cwd.replaceAll("\\", "/");
          const result = programVisitor.enter(path, state);
          addLegacyLocatorIds(path);
          return result;
        },
        exit(path, state) {
          return programVisitor.exit(path, state);
        },
      },
    },
  };
}

module.exports = function locatorWebpackLoader(source) {
  const callback = this.async();
  const filePath = this.resourcePath;

  if (filePath.includes("node_modules") || filePath.includes("middleware.")) {
    callback(null, source);
    return;
  }

  const normalizedFilePath = filePath.replaceAll("\\", "/");
  const normalizedCwd = process.cwd().replaceAll("\\", "/");

  try {
    const result = babel.transformSync(source, {
      filename: normalizedFilePath,
      cwd: normalizedCwd,
      sourceMaps: true,
      sourceFileName: normalizedFilePath,
      babelrc: false,
      configFile: false,
      presets: [
        [
          "@babel/preset-typescript",
          {
            isTSX: true,
            allExtensions: true,
            onlyRemoveTypeImports: true,
          },
        ],
      ],
      plugins: [
        [
          windowsSafeLocatorPlugin,
          {
            ...this.getOptions(),
            dataAttribute: "path",
          },
        ],
      ],
      compact: false,
    });

    if (!result?.code) {
      callback(null, source);
      return;
    }

    callback(null, result.code, result.map || undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[@locator/webpack-loader] Failed to transform ${filePath}: ${message}`);
    callback(null, source);
  }
};
