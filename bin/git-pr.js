import { Octokit } from '@octokit/rest';
import { execSync } from 'child_process';
import moment from "moment";
import chalk from "chalk";
import inquirer from "inquirer";
import * as dotenv from "dotenv";
import path, {dirname} from "path";
import {fileURLToPath} from "url";
moment.locale('zh-cn')

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// 获取上级目录中的 .env 文件路径
const envPath = path.resolve(__dirname, '..', '.env');

dotenv.config({ path: envPath });

const token = process.env.GITHUB_TOKEN;

const octokit = new Octokit({
  auth: token
});

// 校验 git token
const validateToken = async () => {
  // 检查 token 是否存在
  if (!token) {
    console.error('🚫请配置 GitHub Token，执行 re config 命令初始化');
    console.log(`🔗获取 GitHub Token 地址：https://github.com/settings/tokens`)
    process.exit();
  }

  // 检查 token 是否过期
  try {
    await octokit.request('GET /user');
  } catch (error) {
    console.error('🚫GitHub Token 已过期/不可用，请更新，执行 re config 命令更新');
    console.log(`🔗获取 GitHub Token 地址：https://github.com/settings/tokens`)
    process.exit();
  }
}
// 获取 Git 仓库信息
const getGitRepoInfo = () => {
  try {
    // 获取当前分支名
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    // 获取最新一次commit信息
    const latestCommitMessage = execSync('git log --format=%B -n 1', { encoding: 'utf-8' }).trim();

    // 获取最近一次commit时间
    const latestCommitTime = execSync('git log -1 --format=%cd', { encoding: 'utf-8' }).trim();

    const repoUrl = execSync('git config --get remote.origin.url', { encoding: 'utf-8' }).trim();
    // 获取仓库名称
    const repoName = path.basename(repoUrl, '.git');
    // 获取远程仓库 URL
    const remoteUrl = execSync('git remote -v', { encoding: 'utf-8' }).trim().split('\n')[0];
    // 从 URL 中提取仓库所属的组织或用户
    const ownerName = remoteUrl.match(/github\.com[:/](.+)\/.+/)[1];

    return {
      branch,
      repoName,
      ownerName,
      latestCommitMessage,
      latestCommitTime,
      remoteUrl
    };
  } catch (error) {
    console.error('🚫获取 Git 仓库信息失败：', error);
    process.exit();
  }
}

// 检查源分支和目标分支是否存在
const checkBranch = async (owner, repo, branch) => {
  try {
    // 检查源分支和目标分支是否存在
    await octokit.repos.getBranch({
      owner,
      repo,
      branch,
    });
  } catch (err) {
    console.log(`🚫${branch}分支 不存在，请检查或创建。`);
    process.exit();
  }
}

// 检查是否存在未合并的 PR
const checkOpenPR = async (owner, repo, sourceBranch, targetBranch)  => {
  try {
    const { data: pullRequests } = await octokit.rest.pulls.list({
      owner,
      repo,
      state: 'open'
    });

    const pr = pullRequests.find(pr => pr.base.ref === targetBranch && pr.head.ref === sourceBranch);

    if (pr) {
      console.log('🔗当前已有 PR：', pr.html_url);
      // 返回 pr 信息
      return pr;
    } else {
      return false;
    }
  } catch (error) {
    console.error('🚫检查 PR 错误:', error);
  }
}

// 提交 PR
const createPR = async (owner, repo, sourceBranch, targetBranch) => {
  const { commitPR } = await inquirer.prompt({
    type: 'confirm',
    name: 'commitPR',
    message: `将 ${sourceBranch}分支 合并到 ${targetBranch}分支，是否提交PR？`,
  })
  if (!commitPR) {
    console.log('🚫取消 PR 提交');
    process.exit();
  }

  try {
    const { data: pullRequest } = await octokit.rest.pulls.create({
      owner,
      repo,
      title: `Merge ${sourceBranch} into ${targetBranch}`,
      head: sourceBranch,
      base: targetBranch,
    });

    console.log('🚀 PR 创建成功：', pullRequest.html_url);

    // 返回 pr 信息
    return pullRequest;
  } catch (error) {
    console.error('🚫PR 创建失败：', error);
    process.exit();
  }
}

// 合并 PR
const mergePR = async (owner, repo, prINfo, targetBranch) => {
  const prNumber = prINfo.number
  if (targetBranch === 'main' || targetBranch === 'master') {
    console.log(`🚫主分支请手动合并，地址 ${prINfo.html_url}`)
    process.exit();
  }
  const { mergePR } = await inquirer.prompt({
    type: 'confirm',
    name: 'mergePR',
    message: `是否合并 PR #${prNumber}？`,
  })
  if (!mergePR) {
    console.log('🚫取消 PR 合并');
    process.exit();
  }

  try {
    await octokit.rest.pulls.merge({
      owner,
      repo,
      pull_number: prNumber,
    });

    console.log('🚀 PR 合并成功!');
  } catch (error) {
    console.error('🚫PR 合并失败：', error);
    process.exit();
  }
}

const gitPr = async (branchName, options) => {
  await validateToken();
  const repoInfo = getGitRepoInfo();

  const targetBranch = branchName || 'beta'; // 要合并到的目标分支
  const sourceBranch = options.branch || repoInfo.branch; // 要合并的源分支
  const repository_name = repoInfo.repoName; // 仓库名称
  const owner_name = repoInfo.ownerName; // 仓库所属的组织或用户
  const latestCommitTime =new Date(repoInfo.latestCommitTime); // 获取最近一次commit时间
  const latestCommitMessage = repoInfo.latestCommitMessage; // 获取最新一次commit信息
  const formatDate = moment(latestCommitTime).format('YYYY-MM-DD HH:mm:ss');
  const formNow = moment(latestCommitTime).fromNow();

  console.log('💼当前仓库：', `${repository_name}`);
  console.log('🧰当前分支：', sourceBranch);
  console.log('🎯合并目标分支：', targetBranch);
  console.log('🕐最近一次提交时间：', chalk.magenta(`${formatDate}(${formNow})`))
  console.log('📨最近一次提交信息：', chalk.magenta(`${latestCommitMessage}`))

  async function mergeBranches() {
    try {
       // 检查源分支和目标分支是否存在
      await checkBranch(owner_name, repository_name, sourceBranch);
      await checkBranch(owner_name, repository_name, targetBranch);

      const prINfo = await checkOpenPR(owner_name, repository_name, sourceBranch, targetBranch);

      if (prINfo) {
        await mergePR(owner_name, repository_name, prINfo, targetBranch);
      } else {
        const prINfo = await createPR(owner_name, repository_name, sourceBranch, targetBranch);
        await mergePR(owner_name, repository_name, prINfo, targetBranch);
      }
    } catch (error) {
      console.error('🚫Error:', error);
      process.exit();
    }
  }

  void mergeBranches();

}

export default gitPr