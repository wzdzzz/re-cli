#! /usr/bin/env node --no-warnings

import chalk from 'chalk';
import { program } from 'commander';
import figlet from "figlet";
import packageInfo from '../package.json' assert { type: "json" };
import create from "./create.js";
import gitPr from "./git-pr.js";
import initConfig from "./init-config.js";
import api from "./api.js";

program.name("re-cli").usage(`<command> [option]`)

// create
program
  .command('create [projectName]') // 命令名称
  .alias('c') // 命令别名
  .description('创建项目') // 命令描述
  .option('-f, --force', '是否强制覆盖') // 命令选项
  .usage(`<command> [option]`) // 命令用法
  .action(create);

// git
program
  .command('pull-request [targetBranch]')
  .alias('pr')
  .description('自动创建pr，默认是 当前分支 合并到 beta分支')
  .option('-a, auto', '自动合并pr')
  .option('-b, --branch <sourceBranch>', 'source 分支')
  .usage(`<command> [option]`) // 命令用法
  .action(gitPr)

// init
program
  .command('config')
  .description("初始化配置")
  .usage("<command>")
  .action(initConfig);

// api
program
  .command('api [url]>')
  .description("生成api文件")
  .usage("<command>")
  .option("-n, --namespace", "api命名空间")
  .action(api);

// 监听用户输入--help
program.on("--help", function () {
  // 前后两个空行调整格式，更舒适
  console.log();
  console.log(
    chalk.green(
      figlet.textSync("RE-CLI", {
        font: "Ghost",
        horizontalLayout: "default",
        verticalLayout: "default",
        width: 300,
        whitespaceBreak: true,
      }))
  )
  console.log(
    `Run ${chalk.cyan(
      "re-cli <command> --help"
    )} for detailed usage of given command.`
  );
  console.log();
});

program.version(`re-cli v${packageInfo.version}`)

program.parse(process.argv);