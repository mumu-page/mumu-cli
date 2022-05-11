const fs = require('fs');
const path = require('path');
const fsExtra = require('fs-extra');
const readPkg = require('read-pkg');
const { execSync } = require('child_process');
const sh = require('shelljs');
const releaseAPIMap = require('../api/config')
const inquirer = require('inquirer');

function writeFileTree (dir, files) {
  Object.keys(files).forEach((name) => {
    const filePath = path.join(dir, name)
    fsExtra.ensureDirSync(path.dirname(filePath))
    fsExtra.writeFileSync(filePath, files[name])
  })
}

function resolveJson (context, name = 'package.json') {
  if (fs.existsSync(path.join(context, name))) {
    return readPkg.sync({
      cwd: context
    })
  }
  return {}
}

async function selectEnv () {
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
  const res = await inquirer.prompt(platformQues);
  return res.env
}

function deploy (gitUrl) {
  try {
    process.execSync(
      [
        `git init`,
        `git remote add origin ${gitUrl}`,
        `git add -A`,
        `git commit -m 'deploy'`,
        `git checkout -b gh-pages`,
        `git push -f origin gh-pages`,
        `cd -`, // 回到最初目录 liunx
      ].join(' && '))
  } catch (error) {
    console.log(error);
  }
}

function pusBranch () {
  try {
    execSync(`git add . && git commit -m 'release project' && git push`);
  } catch (e) {
    console.log(e);
  }
}

class Shell {
  constructor() {
    this.shell = sh;
  }
  exec (command) {
    return new Promise((resolve, reject) => {
      sh.exec(
        command,
        {
          async: true
        },
        (code, stdout, stderr) => {
          stdout = stdout.toString().trim();
          if (code === 0) {
            if (stderr) {
              console.error(stderr.toString().trim());
            }
            resolve(stdout);
          } else {
            if (stdout && stderr) {
              console.error(`\n${stdout}`);
            }
            reject(new Error(stderr || stdout));
          }
        }
      );
    });
  }
}

module.exports = {
  writeFileTree,
  resolveJson,
  pusBranch,
  Shell,
  selectEnv,
  deploy
}
