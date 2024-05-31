import fs from 'fs-extra';
import path from "path";
import inquirer from "inquirer";
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function updateEnv(data) {
  const envFilePath = path.resolve(__dirname, '..', '.env');

  let envContent = fs.existsSync(envFilePath) ? fs.readFileSync(envFilePath, 'utf8') : '';

  const envVariables = envContent.split('\n').reduce((acc, line) => {
    const [k, v] = line.split('=');
    if (k && v !== undefined) {
      acc[k.trim()] = v.trim();
    }
    return acc;
  }, {});

  const newEnvContent = Object.entries({...envVariables, ...data})
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  fs.writeFileSync(envFilePath, newEnvContent, 'utf8');
  console.log('🎉配置成功');
}

const initConfig = () => {
  inquirer.prompt([
    {
      type: 'input',
      name: 'GITHUB_TOKEN',
      message: '请输入 GitHub Token：',
    },
   // 如需有其他配置项，可继续添加
   //  {
   //    type: 'input',
   //    name: 'OTHER_TOKEN',
   //    message: '请输入 Other Token：',
   //  },
  ]).then(answers => {
    // 过滤掉空值
    updateEnv(Object.entries(answers).reduce((acc, [k, v]) => {
      if (v) {
        acc[k] = v.trim();
      }
      return acc;
    }, {}));
  })
}

export default initConfig;