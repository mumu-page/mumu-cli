const { execSync } = require('child_process');
const process = require('process');
const inquirer = require('inquirer');
const axios = require('axios');
const chalk = require('chalk');
const ora = require('ora');
const { writeFileTree, resolveJson, pusBranch } = require('../lib/utils');

const rootPath = process.cwd();

const releaseAPIMap = {
  test: 'http://localhost:7001',
  preview: 'http://localhost:7001',
  production: 'https://api.resonance.fun:8080',
}

const platformQues = [
  {
    type: 'list',
    name: 'env',
    message: '请选择打包环境',
    default: 'test',
    choices: [
      {
        key: 'test',
        name: `测试(TEST) - ${releaseAPIMap.test}`,
        value: 'test',
      },
      {
        key: 'preview',
        name: `预发(PRE) - ${releaseAPIMap.preview}`,
        value: 'preview',
      },
      {
        key: 'production',
        name: `生产(PRO) - ${releaseAPIMap.production}`,
        value: 'production',
      },
    ]
  }
];

async function upVersion() {
  const pkg = resolveJson(rootPath);
  // master 版本号自增
  const v = pkg.version.split('.');
  v[2] = Number(v[2]) < 10 ? Number(v[2]) + 1 : 0;
  v[1] = v[2] === 0 ? Number(v[1]) + 1 : Number(v[1]);
  v[1] = v[1] < 10 ? Number(v[1]) : 0;
  v[0] = v[1] === 0 ? Number(v[0]) + 1 : v[0];
  pkg.version = v.join('.');
  await writeFileTree(rootPath, {
    'package.json': JSON.stringify(pkg, null, 2)
  });
}

async function release() {
  // 构建
  const res = await inquirer.prompt(platformQues);
  const { env } = res;
  const mode = env;
  execSync(`npx vue-cli-service build ${mode ? `--mode ${mode}` : ''}`, { stdio: 'inherit' });

  // 发布
  const baseApi = releaseAPIMap[mode];
  const templateConfig = require(`${process.cwd()}/mumu.config.js`);
  // 升级版本
  const spinner = ora('🗃 开始提交模板...').start();
  await upVersion();
  pusBranch();
  spinner.succeed('🎉 模版提交完成');
  await releaseTemplate({ ...templateConfig, baseApi });
}

async function releaseTemplate({
  snapshot,
  name,
  templateName,
  author,
  baseApi,
  gitUrl
}) {
  try {
    await axios
      .post(`${baseApi}/template/update`, {
        name,
        templateName,
        author,
        snapshot,
        gitUrl,
        version: resolveJson(rootPath).version
      });
    chalk.green(`🎉 🎉 发布成功！`);
  } catch (error) {
    console.log(error);
  }
}



module.exports = release;
