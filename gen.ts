import * as fs from "fs";

const query = fs.readFileSync('get-project-items.gql', 'utf-8');

fs.writeFileSync('src/get-project-items.ts', `export const QUERY = \`${query}\``);

console.log('Generated get-project-items.gql.ts');

