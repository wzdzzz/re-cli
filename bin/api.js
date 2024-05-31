import {generateService} from '@umijs/openapi'
import fs from "fs-extra";
import path, {dirname} from "path";
import {fileURLToPath} from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function decodeRefs(jsonData) {
  // 遍历 paths 属性
  for (const pathKey in jsonData.paths) {
    const path = jsonData.paths[pathKey];

    // 遍历每个请求方法（post、get等）
    for (const methodKey in path) {
      const method = path[methodKey];

      // 如果包含 $ref 属性，则解码
      if (
        method.responses &&
        method.responses['200'] &&
        method.responses['200'].content &&
        method.responses['200'].content['application/json'] &&
        method.responses['200'].content['application/json'].schema &&
        method.responses['200'].content['application/json'].schema['$ref']
      ) {
        method.responses['200'].content['application/json'].schema['$ref'] = decodeURIComponent(
          method.responses['200'].content['application/json'].schema['$ref']
        );
      }

      // 过滤掉 name 为 "JSESSIONID" 的参数对象
      if (method.parameters) {
        method.parameters = method.parameters.filter(param => param.in !== "cookie");
      }

      // 如果参数列表为空，则移除 parameters 属性
      if (method.parameters.length === 0) {
        method.parameters = []
      }
    }
  }

  return jsonData;
}

const api = (url, options) => {
  if (!url) {
    console.log('🚫命令格式为：re api [url] <options>，url为必传参数')
    process.exit(1)
  }
  const { namespace } = options
  // 通过fetch先读取数据并处理后再给generateService
  fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })
    .then((res) => res.json())
    .then((res) => {
      const data = decodeRefs(res)
      // 将data临时存储到json中
      const jsonPath = path.resolve(__dirname, '..', './_api.json')

      fs.writeFileSync(jsonPath, JSON.stringify(data))
      // 将data作为链接传递给generateService
      generateService({
        schemaPath: jsonPath,
        serversPath: './src/generated',
        requestImportStatement: 'import { request } from \'@umijs/max\';',
        namespace: namespace || 'OPENAPI',
        hook: {
          customFileNames: function (operationObject, apiPath) {
            const operationId = operationObject.operationId;
            if (!operationId) {
              console.warn('🔅[Warning] no operationId', apiPath);

              return [apiPath];
            }
            const res = operationId.split('_');

            const controllerName = (res || [])[0] + 'Api';
            if (controllerName) {
              return [controllerName];
            }
          }
        }
      }).then(r => {
        console.log(r)
        // 删除
        fs.unlinkSync(jsonPath)
      })
    })
    .catch((err) => {
      console.error('🚫Error:', err)
    })
}

export default api;