import * as ts from 'typescript';
import * as fs from 'fs';
import type { ImportInfo, ExportInfo } from '@codeview/shared';

export interface ParseResult {
  imports: ImportInfo[];
  exports: ExportInfo[];
}

export function parseFile(filePath: string): ParseResult {
  const content = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('.tsx') || filePath.endsWith('.jsx')
      ? ts.ScriptKind.TSX
      : ts.ScriptKind.TS
  );

  const imports: ImportInfo[] = [];
  const exports: ExportInfo[] = [];

  ts.forEachChild(sourceFile, (node) => {
    // Import declarations: import { X } from 'Y'
    if (ts.isImportDeclaration(node)) {
      const moduleSpecifier = node.moduleSpecifier;
      if (ts.isStringLiteral(moduleSpecifier)) {
        const specifiers: string[] = [];
        const clause = node.importClause;
        if (clause) {
          // Default import
          if (clause.name) {
            specifiers.push(clause.name.text);
          }
          // Named imports: { A, B }
          if (clause.namedBindings) {
            if (ts.isNamedImports(clause.namedBindings)) {
              for (const el of clause.namedBindings.elements) {
                specifiers.push(el.name.text);
              }
            }
            // Namespace import: * as X
            if (ts.isNamespaceImport(clause.namedBindings)) {
              specifiers.push(clause.namedBindings.name.text);
            }
          }
        }
        imports.push({
          source: moduleSpecifier.text,
          specifiers,
          isTypeOnly: clause?.isTypeOnly ?? false,
          isDynamic: false,
        });
      }
    }

    // Dynamic imports: import('X')
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const arg = node.arguments[0];
      if (arg && ts.isStringLiteral(arg)) {
        imports.push({
          source: arg.text,
          specifiers: [],
          isTypeOnly: false,
          isDynamic: true,
        });
      }
    }

    // Require calls: const X = require('Y')
    if (
      ts.isVariableStatement(node) &&
      node.declarationList.declarations.length > 0
    ) {
      for (const decl of node.declarationList.declarations) {
        if (
          decl.initializer &&
          ts.isCallExpression(decl.initializer) &&
          ts.isIdentifier(decl.initializer.expression) &&
          decl.initializer.expression.text === 'require' &&
          decl.initializer.arguments.length > 0
        ) {
          const arg = decl.initializer.arguments[0];
          if (ts.isStringLiteral(arg)) {
            imports.push({
              source: arg.text,
              specifiers: decl.name && ts.isIdentifier(decl.name) ? [decl.name.text] : [],
              isTypeOnly: false,
              isDynamic: false,
            });
          }
        }
      }
    }

    // Export declarations
    // Named exports: export { X, Y }
    if (ts.isExportDeclaration(node)) {
      if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        for (const el of node.exportClause.elements) {
          exports.push({
            name: el.name.text,
            isDefault: false,
            isTypeOnly: node.isTypeOnly,
          });
        }
      }
      // Re-export: export * from 'X'
      if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        imports.push({
          source: node.moduleSpecifier.text,
          specifiers: [],
          isTypeOnly: node.isTypeOnly,
          isDynamic: false,
        });
      }
    }

    // export default ...
    if (ts.isExportAssignment(node)) {
      exports.push({
        name: 'default',
        isDefault: true,
        isTypeOnly: false,
      });
    }

    // export function/class/const
    if (hasExportModifier(node)) {
      const name = getDeclarationName(node);
      if (name) {
        const mods = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
        const isDefault = mods?.some(
          (m: ts.Modifier) => m.kind === ts.SyntaxKind.DefaultKeyword
        ) ?? false;
        exports.push({
          name: isDefault ? 'default' : name,
          isDefault,
          isTypeOnly: false,
        });
      }
    }
  });

  // Also walk deeper for dynamic imports
  walkForDynamicImports(sourceFile, imports);

  return { imports, exports };
}

function hasExportModifier(node: ts.Node): boolean {
  if (!ts.canHaveModifiers(node)) return false;
  const mods = ts.getModifiers(node);
  return mods?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
}

function getDeclarationName(node: ts.Node): string | null {
  if (ts.isFunctionDeclaration(node) && node.name) return node.name.text;
  if (ts.isClassDeclaration(node) && node.name) return node.name.text;
  if (ts.isInterfaceDeclaration(node)) return node.name.text;
  if (ts.isTypeAliasDeclaration(node)) return node.name.text;
  if (ts.isEnumDeclaration(node)) return node.name.text;
  if (ts.isVariableStatement(node)) {
    const first = node.declarationList.declarations[0];
    if (first && ts.isIdentifier(first.name)) return first.name.text;
  }
  return null;
}

function walkForDynamicImports(node: ts.Node, imports: ImportInfo[]): void {
  ts.forEachChild(node, (child) => {
    if (
      ts.isCallExpression(child) &&
      child.expression.kind === ts.SyntaxKind.ImportKeyword
    ) {
      const arg = child.arguments[0];
      if (arg && ts.isStringLiteral(arg)) {
        // Check we haven't already added this
        const source = arg.text;
        if (!imports.some((i) => i.source === source && i.isDynamic)) {
          imports.push({
            source,
            specifiers: [],
            isTypeOnly: false,
            isDynamic: true,
          });
        }
      }
    }
    walkForDynamicImports(child, imports);
  });
}
