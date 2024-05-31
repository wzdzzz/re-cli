import inquirer from "inquirer";
import path from "path";
import fs from "fs-extra";
import templates from "./templates.js";
import ora from "ora";
import download from "download-git-repo";
import chalk from "chalk";

const create = async (projectName, options) => {
  const { force } = options

  // 如果用户没有传入名称就交互式输入
  if(!projectName) {
    const { name } = await inquirer.prompt({
      type: "input",
      name: "name",
      message: "请输入项目名称：",
    })
    projectName = name // 赋值输入的项目名称
  }
  console.log('项目名称：', projectName)

  // 获取目标文件夹路径
  const dest = path.join(process.cwd(), projectName)
  // 判断文件夹是否存在，存在就交互询问用户是否覆盖
  if(fs.existsSync(dest)) {
    if (force) {
      console.log('目录已存在，强制覆盖')
      fs.removeSync(dest)
    } else {
      const { selectForce } = await inquirer.prompt({
        type: 'confirm',
        name: 'selectForce',
        message: '目录已存在，是否覆盖？'
      })
      // 如果覆盖就删除文件夹继续往下执行，否的话就退出进程
      selectForce ? fs.removeSync(dest) : process.exit(1)
    }
  }

  try {
    let { choose } = await inquirer.prompt([
      {
        type: 'list',
        name: 'choose',
        message: '请选择模板',
        choices: templates.map(item => item.name),
      }])

    const syncTemplate = ora('同步模板中....')
    syncTemplate.start();

    // 下载模板
    download(
      templates.find(item => item.name === choose).value,
      `./${projectName}`,
      {
        clone: true,
      },
      function(err) {
        if (err) {
          console.error(err);
          process.exit(1)
          return;
        }
        syncTemplate.succeed();
        console.log(
          chalk.green('✅ ' + chalk.blue.underline.bold(projectName) + ' 项目创建成功!')
        )
        console.log(`\ncd ${projectName}`)
        console.log('npm i')
        console.log('npm start\n')
      }
    )
  } catch (err) {
    console.error(err)
  }
}

export default create