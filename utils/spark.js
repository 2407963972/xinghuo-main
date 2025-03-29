import CryptoJs from 'crypto-js'
import Functions from './functions'
const signatureToHmacSHA256ToBase64 = (origin, secret) => {
  let signatureSha = CryptoJs.HmacSHA256(origin, secret);
  let signature = CryptoJs.enc.Base64.stringify(signatureSha);
  return signature
}
// 鉴权url地址
const getWebsocketUrl = () => {
  try {
    const hostUrl = import.meta.env.VITE_APP_SPARK_URL || 'wss://spark-api.xf-yun.com/v3.5/chat';
    // 将 wss:// 转换为 https:// 以便 URL 正确解析
    const httpsUrl = hostUrl.replace(/^wss:\/\//i, 'https://');
    
    let host, pathname;
    try {
      const urlObj = new URL(httpsUrl);
      host = urlObj.host;
      pathname = urlObj.pathname;
    } catch (e) {
      console.error('URL解析错误，使用备用解析方法', e);
      // 备用解析方法
      const urlParts = httpsUrl.split('://');
      if (urlParts.length > 1) {
        const rest = urlParts[1].split('/');
        host = rest[0];
        pathname = '/' + rest.slice(1).join('/');
      } else {
        host = 'spark-api.xf-yun.com';
        pathname = '/v3.5/chat';
      }
    }
    
    const apiKey = import.meta.env.VITE_APP_SPARK_APIKEY;
    const apiSecret = import.meta.env.VITE_APP_SPARK_APISECRET;
    let apiKeyName = "api_key";
    let date = new Date().toGMTString();
    let algorithm = "hmac-sha256"
    let headers = "host date request-line";
    let signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${pathname} HTTP/1.1`;
    let signature = signatureToHmacSHA256ToBase64(signatureOrigin, apiSecret)
    let authorizationOrigin = `${apiKeyName}="${apiKey}", algorithm="${algorithm}", headers="${headers}", signature="${signature}"`;
    let authorization = btoa(authorizationOrigin)
    // 将空格编码
    let url = `${hostUrl}?authorization=${authorization}&date=${encodeURI(date)}&host=${host}`;
    return url;
  } catch (error) {
    console.error('获取WebSocket URL失败:', error);
    throw error;
  }
}
/**
 *  获取参数
 * @param {Array} textList [
       { "role": "user", "content": "你是谁" }, //# 用户的历史问题
       { "role": "assistant", "content": "我是AI助手" },  //# AI的历史回答结果
       // ....... 省略的历史对话
       { "role": "user", "content": inputVal },  //# 最新的一条问题，如无需上下文，可只传最新一条问题
   ]
 * @returns 
 */
export const getParams = (textList) => {
  let functions = Functions.getFunctions()
  let params = {
    "header": {
      "app_id": import.meta.env.VITE_APP_SPARK_APPID,
      "uid": import.meta.env.VITE_APP_SPARK_UID
    },
    "parameter": {
      "chat": {
        "domain": import.meta.env.VITE_APP_DOMAIN,
        "temperature": 0.5,
        "max_tokens": 4096,
      }
    },
    "payload": {
      "message": {
        // 如果想获取结合上下文的回答，需要开发者每次将历史问答信息一起传给服务端，如下示例
        // 注意：text里面的所有content内容加一起的tokens需要控制在8192以内，开发者如有较长对话需求，需要适当裁剪历史信息
        "text": textList
      },
      "functions": {
        "text": functions
      }
    }
  }
  return params;
};

// 每次聊天都要重新建立连接,使用异步等待
export const getWSConnect = async () => {
  const url = getWebsocketUrl();
  const ws = new WebSocket(url);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', (event) => {
      console.log('开启连接！！', event);
      resolve(event)
    });
    ws.addEventListener('error', (error) => {
      console.log('连接发送错误！！', error);
      reject(error)
    });
  });
  return ws;
}