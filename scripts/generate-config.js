import fs from 'fs';
import dotenv from 'dotenv';

const env = dotenv.parse(fs.readFileSync('.env'));

const output = `// AUTO-GENERATED — do not edit
export const config = ${JSON.stringify(env, null, 2)};
`;

fs.writeFileSync('src/generated-config.js', output);