/*
芥么签到&提现&日常任务
入口：[微信-芥么小程序]
6 0,9 * * *
*/
const $ = new Env('京东芥么小程序-签到&提现&日常任务');
const zooFaker = require('./JDJRValidator_Aaron');
const CryptoJS = require('crypto-js');
$.get = zooFaker.injectToRequest2($.get.bind($));
$.post = zooFaker.injectToRequest2($.post.bind($));
const notify = $.isNode() ? require('./sendNotify') : '';
const{ getUUID, queryString } = require("./commonUtil")
//Node.js用户请在jdCookie.js处填写京东ck;
const jdCookieNode = $.isNode() ? require('./jdCookie.js') : '';
//IOS等用户直接用NobyDa的jd cookie
let cookiesArr = [], cookie = '';
let algo = {
    '7bfbb': {}
};
let host = 'api.m.jd.com'
let uuid = getUUID()
let UA = $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.4.4;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1")
Date.prototype.Format = function(fmt) {
    var e,
        n = this,
        d = fmt,
        l = {
            "M+": n.getMonth() + 1,
            "d+": n.getDate(),
            "D+": n.getDate(),
            "h+": n.getHours(),
            "H+": n.getHours(),
            "m+": n.getMinutes(),
            "s+": n.getSeconds(),
            "w+": n.getDay(),
            "q+": Math.floor((n.getMonth() + 3) / 3),
            "S+": n.getMilliseconds()
        };
    /(y+)/i.test(d) && (d = d.replace(RegExp.$1, "".concat(n.getFullYear()).substr(4 - RegExp.$1.length)));
    for (var k in l) {
        if (new RegExp("(".concat(k, ")")).test(d)) {
            var t, a = "S+" === k ? "000" : "00";
            d = d.replace(RegExp.$1, 1 == RegExp.$1.length ? l[k] : ("".concat(a) + l[k]).substr("".concat(l[k]).length))
        }
    }
    return d;
}
if ($.isNode()) {
    Object.keys(jdCookieNode).forEach((item) => {
        cookiesArr.push(jdCookieNode[item])
    })
    if (process.env.JD_DEBUG && process.env.JD_DEBUG === 'false') console.log = () => {
    };
} else {
    cookiesArr = [$.getdata('CookieJD'), $.getdata('CookieJD2'), ...jsonParse($.getdata('CookiesJD') || "[]").map(item => item.cookie)].filter(item => !!item);
}
!(async () => {
    if (!cookiesArr[0]) {
        $.msg($.name, '【提示】请先获取京东账号一cookie\n直接使用NobyDa的京东签到获取', 'https://bean.m.jd.com/bean/signIndex.action', { "open-url": "https://bean.m.jd.com/bean/signIndex.action" });
        return;
    }
    for (let i = 0; i < cookiesArr.length; i++) {
        cookie = cookiesArr[i];
        if (cookie) {
            $.UserName = decodeURIComponent(cookie.match(/pt_pin=([^; ]+)(?=;?)/) && cookie.match(/pt_pin=([^; ]+)(?=;?)/)[1])
            $.index = i + 1;
            $.isLogin = true;
            $.nickName = '';
            if (!$.isLogin) {
                $.msg($.name, `【提示】cookie已失效`, `京东账号${$.index} ${$.nickName || $.UserName}\n请重新登录获取\nhttps://bean.m.jd.com/bean/signIndex.action`, { "open-url": "https://bean.m.jd.com/bean/signIndex.action" });
                continue
            }
            console.log(`\n******开始【京东账号${$.index}】${$.nickName || $.UserName}*********\n`);
            await main()
            await $.wait(2000)
            // await duty()
        }
    }
})().catch((e) => { $.log('', `❌ ${$.name}, 失败! 原因: ${e}!`, '') }).finally(() => { $.done(); })

async function main() {
    await getAlgo('7bfbb');
    await $.wait(1000);
    // 开始签到
    await apSignIn_day();
    await $.wait(3000);
    // 获取奖励列表
    await signPrizeDetailList();
    if ($.tasklist) {
        for (const vo of $.tasklist) {
            if (vo.prizeStatus === 0){
                await $.wait(3000);
                // 如果是可提现的，进行提现操作
                await apCashWithDraw(vo.prizeType, vo.business, vo.id, vo.poolBaseId, vo.prizeGroupId, vo.prizeBaseId)
            }
        }
    } else {
        $.log("奖励列表是空的！")
    }
    // 开始做每日任务
    await $.wait(3000);
    await duty()
}

// 每日签到
async function apSignIn_day() {
    let params = {
        code: '7bfbb',
        functionId: 'apSignIn_day',
        appid: 'activities_platform',
        client: 'H5',
        t: new Date().getTime(),
        clientVersion: '1.0.0',
        body: {"linkId": "KRFM89OcZwyjnyOIPyAZxA", "serviceName": "dayDaySignGetRedEnvelopeSignService", "business": 1}
    }
    let h5ts = await getH5st(params);
    let url = `https://${host}/?functionId=${params.functionId}&t=${params.t}&appid=${params.appid}&client=${params.client}&clientVersion=${params.clientVersion}&h5st=${encodeURIComponent(h5ts)}`
    return new Promise(resolve => {
        $.post(taskPostUrl(url, params.body), async (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${err}`)
                    console.log(`${$.name} ，签到接口${params.functionId}，API请求失败，请检查网路重试`)
                } else {
                    if (data) {
                        data = JSON.parse(data);
                        if (data.success) {
                            if (data.data.retCode === 0) {
                                console.log(`签到成功：已连续签${data.data.countInNonstop}天`)
                            } else if (data.data.retCode === 10011){
                                console.log(`签到失败：${data.data.retMessage}`)
                            } else if (data.data.retCode === 10011){
                                console.log(`签名错误触发风控，需要变更fp：${data.data.retMessage}`)
                            }else {
                                console.log(`签到失败，未知错误：${data.data.retMessage}`)
                            }
                        } else {
                            console.log(`签到接口${params.functionId}返回非success数据：${JSON.stringify(data)}`);
                        }
                    } else {
                        console.log(`签到接口${params.functionId}没有返回数据`)
                    }
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve(data);
            }
        })
    })
}
// 查询奖励列表
async function signPrizeDetailList() {
    let params = {
        functionId: 'signPrizeDetailList',
        appid: 'activities_platform',
        client: 'H5',
        t: new Date().getTime(),
        clientVersion: '1.0.0',
        body: {"linkId":"KRFM89OcZwyjnyOIPyAZxA","serviceName":"dayDaySignGetRedEnvelopeSignService","business":1,"pageSize":20,"page":1}
    }
    let url = `https://${host}/?functionId=${params.functionId}&t=${params.t}&appid=${params.appid}&client=${params.client}&clientVersion=${params.clientVersion}`
    return new Promise(resolve => {
        $.post(taskPostUrl(url, params.body), async (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${err}`)
                    console.log(`${$.name} ，奖励列表接口${params.functionId}，API请求失败，请检查网路重试`)
                } else {
                    if (data) {
                        data = JSON.parse(data);
                        if (data.success) {
                            $.tasklist = data.data.prizeDrawBaseVoPageBean.items;
                        } else {
                            console.log(`奖励列表接口${params.functionId}返回非success数据：${JSON.stringify(data)}`);
                        }
                    } else {
                        console.log(`奖励列表接口${params.functionId}没有返回数据`)
                    }
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve(data);
            }
        })
    })
}
// 提现操作
function apCashWithDraw(prizeType, business, id, poolBaseId, prizeGroupId, prizeBaseId) {
    let params = {
        functionId: 'apCashWithDraw',
        appid: 'activities_platform',
        client: 'H5',
        t: new Date().getTime(),
        clientVersion: '1.0.0',
        body: {
            "linkId": "KRFM89OcZwyjnyOIPyAZxA",
            "businessSource": "DAY_DAY_RED_PACKET_SIGN",
            "base": {
                "prizeType": prizeType,
                "business": business,
                "id": id,
                "poolBaseId": poolBaseId,
                "prizeGroupId": prizeGroupId,
                "prizeBaseId": prizeBaseId
            }
        }
    }
    let url = `https://${host}/?functionId=${params.functionId}&t=${params.t}&appid=${params.appid}&client=${params.client}&clientVersion=${params.clientVersion}`
    return new Promise(resolve => {
        $.post(taskPostUrl(url, params.body), async (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${err}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`)
                } else {
                    if (data) {
                        data = JSON.parse(data);
                        if (data.success) {
                            if (data.data.status === "310") {
                                console.log(data.data.message)
                            } else if (data.data.status === "1000") {
                                console.log(`提现失败：${data.data.message}`);
                            } else if(data.data.status === "50053"){
                                console.log(`提现失败：${data.data.message}`)
                            }else {
                                console.log(`提现失败，未知错误：${data.data.message}`)
                            }
                        } else {
                            console.log(JSON.stringify(data));
                        }
                    } else {
                        console.log(`提现接口${params.functionId}没有返回数据`)
                    }
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve(data);
            }
        })
    })
}

async function duty() {
    $.reg = false;
    $.tasklist = [];
    let linkId = "yX3KNttlA6GbZjHuDz0-WQ"
    await task('apTaskList', { "linkId": linkId, "uniqueId": "" })
    await $.wait(2000);
    // await task('findPostTagList', { "typeId": typeid })
    if (!$.reg) {
        if($.tasklist){
            await task('genzTaskCenter')
            if ($.genzTask) {
                $.log(`当前芥么豆：${$.totalPoints}`)
                for (const vo of $.genzTask) {
                    if (!vo.completionStatus) {
                        $.log(`去完成：${vo.taskName}新手任务！`)
                        await task('genzDoNoviceTasks', { "taskId": vo.taskId, "completionStatus": 1 })
                    }
                }
            }
            for (const vo of $.tasklist) {
                // 阅读图文帖
                if (vo.taskType === "BROWSE_PRODUCT" && vo.id === 537) {
                    $.log(`去完成：${vo.taskShowTitle}`)
                    for (let x = 0; x < vo.taskLimitTimes; x++) {
                        if (vo.taskDoTimes != vo.taskLimitTimes) {
                            await task("getTaskPostId", {"contentType":"1"})
                            await task("similarContentList", {"postId":$.postId,"from":"Z100000001","pageSize":5,"uuid":uuid})
                            await task("apTaskTimeRecord", {"linkId":linkId,"taskId":vo.id})
                            await $.wait(17000);
                            await task("getTaskPostId", {"contentType":"1"})
                            await task("similarContentList", {"postId":$.postId,"from":"Z100000001","pageSize":5,"uuid":uuid})
                            await task('apDoTask', {"linkId":linkId,"taskType":vo.taskType,"taskId":vo.id,"channel":"2","itemId":vo.taskSourceUrl})
                        }
                    }
                }
                // 观看视频帖
                if (vo.taskType === "BROWSE_PRODUCT" && vo.id === 536) {
                    $.log(`去完成：${vo.taskShowTitle}`)
                    for (let x = 0; x < vo.taskLimitTimes; x++) {
                        if (vo.taskDoTimes != vo.taskLimitTimes) {
                            await task("getTaskPostId", {"contentType":"2"})
                            await task("similarContentList", {"postId":$.postId,"from":"Z100000001","pageSize":5,"uuid":uuid})
                            await task("apTaskTimeRecord", {"linkId":linkId,"taskId":vo.id})
                            await $.wait(17000);
                            await task("getTaskPostId", {"contentType":"2"})
                            await task("similarContentList", {"postId":$.postId,"from":"Z100000001","pageSize":5,"uuid":uuid})
                            await task('apDoTask', {"linkId":linkId,"taskType":vo.taskType,"taskId":vo.id,"channel":"2","itemId":vo.taskSourceUrl})
                        }
                    }
                }
                // 订阅活动通知
                if (vo.taskType === "JOIN_INTERACT_ACT" && vo.id === 572) {
                    $.log(`去完成：${vo.taskShowTitle}`)
                    for (let x = 0; x < vo.taskLimitTimes; x++) {
                        if (vo.taskDoTimes != vo.taskLimitTimes) {
                            let jumpPage = queryString(vo.forwardUrl, "jumpPage")
                            let businessCode = queryString(vo.forwardUrl, "businessCode")
                            await $.wait(2000);
                            await task("commonSubscribeMessage", {"businessCode":businessCode,"behaviour":"accept","jumpPage":jumpPage})
                        }
                    }
                }

                if (vo.taskDoTimes === vo.taskLimitTimes) {
                    $.log(`任务：${vo.taskShowTitle}，已完成`)
                }
            }
        }else {
            $.log("没有获取到任务列表")
        }
    } else { console.log("未注册！请手动进入一次小程序任务\n入口：微信小程序-芥么-签到") } return;
}
function task(function_id, body) {
    return new Promise(resolve => {
        $.get(taskUrl(function_id, body), async (err, resp, data) => {
            try {
                if (err) {
                    $.log(err)
                } else {
                    data = JSON.parse(data);
                    switch (function_id) {
                        case 'apTaskList':
                            $.tasklist = data.data
                            break;
                        case 'apDoTask':
                            if (data.success) {
                                if (data.code === 0) {
                                    console.log("任务完成")
                                }
                            } else {
                                console.log(JSON.stringify(data));
                            }
                            break;
                        case 'findPostTagList':
                            if (data.code === 0) {
                                $.taglist = data.data;
                            } else if (data.code === 4001) {
                                $.reg = true;
                            } else {
                                console.log(JSON.stringify(data));
                            }
                            break;
                        case 'findTagPosts':
                            if (data.code === 0) {
                                $.postlist = data.data.list;
                            }
                            break;
                        case 'likePosts':
                            if (data.code === 0) {
                                console.log(data.data);
                            } else {
                                console.log(JSON.stringify(data));
                            }
                            break;
                        case 'cancelLikePosts':
                            if (data.code === 0) {
                                console.log(data.data);
                            } else {
                                console.log(JSON.stringify(data));
                            }
                            break;
                        case 'followHim':
                            if (data.code === 0) {
                                console.log("关注成功");
                            } else {
                                console.log(JSON.stringify(data));
                            }
                            break;
                        case 'cancelFollowHim':
                            if (data.code === 0) {
                                console.log("取消关注");
                            } else {
                                console.log(JSON.stringify(data));
                            }
                            break;
                        case 'genzTaskCenter':
                            $.genzTask = data.data.noviceTaskStatusList;
                            $.totalPoints = data.data.totalPoints;
                            break;
                        case 'getTaskPostId':
                            if (data.code === 0) {
                                $.postId = data.data
                            } else {
                                console.log(JSON.stringify(data));
                            }
                            break;
                        case 'commonSubscribeMessage':
                            if (data.code === 0) {
                                console.log("订阅活动成功");
                            } else {
                                console.log(JSON.stringify(data));
                            }
                            break;
                        case 'genzDoNoviceTasks':
                            if (data.success) {
                                if (data.data) {
                                    console.log("任务完成");
                                } else {
                                    console.log(JSON.stringify(data));
                                }
                            } else {
                                console.log(JSON.stringify(data));
                            }
                            break;
                        default:
                            $.log(JSON.stringify(data))
                            break;
                    }
                }
            } catch (error) {
                $.log(error)
            } finally {
                resolve();
            }
        })
    })
}

function taskUrl(function_id, body) {
    return {
        url: `https://${host}/?functionId=${function_id}&body=${encodeURIComponent(JSON.stringify(body))}&_t=${new Date().getTime()}&appid=gen-z`,
        headers: {
            "Host": host,
            "Connection": "keep-alive",
            "content-type": "application/json",
            "Accept-Encoding": "gzip, deflate",
            "User-Agent": UA,
            "Cookie": cookie,
            "Referer": "https://servicewechat.com/wx9a412175d4e99f91/68/page-frame.html",
        },
    }
}
function random(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}
function taskPostUrl(url, body) {
    return {
        url: url,
        body: `body=${encodeURIComponent(JSON.stringify(body))}`,
        headers: {
            "Host": host,
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "*/*",
            "Accept-Language": "zh-CN,zh-Hans;q=0.9",
            "Accept-Encoding": "gzip, deflate",
            "Origin": "https://zsign.jd.com",
            "User-Agent": UA,
            "Referer": "https://zsign.jd.com",
            "Cookie": cookie
        }
    }
}

// 以下为参数加密工具
async function getAlgo(id) {
    // let fp = await generateFp();
    let fp = "4494882651784006";
    algo[id].fingerprint = fp;
    const options = {
        "url": `https://cactus.jd.com/request_algo`,
        "headers": {
            'Accept': 'application/json',
            'Host': 'cactus.jd.com',
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1',
            'Content-Type': 'application/json'
        },
        'body': JSON.stringify({
            "version": "3.0",
            "fp": fp,
            "appId": id.toString(),
            "timestamp": Date.now(),
            "platform": "H5",
            "expandParams": ""
        })
    }
    return new Promise(async resolve => {
        $.post(options, (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${JSON.stringify(err)}`)
                    console.log(`request_algo 签名参数API请求失败，请检查网路重试`)
                } else {
                    if (data) {
                        data = JSON.parse(data);
                        if (data['status'] === 200) {
                            algo[id].token = data.data.result.tk;
                            let enCryptMethodJDString = data.data.result.algo;
                            // algo[id].token = "tk02w7c991bdc18nWVG3K19S0diezOF7GAd7tkBCd51XPNXXtuy7J/pvWG5QYVLtZlMabTpNiz1yo8WyRNArin2I5dzO";
                            // let enCryptMethodJDString = "function test(tk,fp,ts,ai,algo){var rd='VG3K19S0dieL';var str=`${tk}${fp}${ts}${ai}${rd}`;return algo.SHA256(str)}";
                            if (enCryptMethodJDString) algo[id].enCryptMethodJD = new Function(`return ${enCryptMethodJDString}`)();
                            console.log(`获取加密参数成功！`)
                        } else {
                            console.log(`fp: ${fp}`)
                            console.log('request_algo 签名参数API请求失败:')
                        }
                    } else {
                        console.log(`京东服务器返回空数据`)
                    }
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve();
            }
        })
    })
}
function generateFp() {
    let e = "0123456789";
    let a = 13;
    let i = '';
    for (; a--;)
        i += e[Math.random() * e.length | 0];
    return (i + Date.now()).slice(0, 16)
}
async function getH5st(params) {
    let date = new Date(), key, SHA256;
    let timeStamp = date.getTime()
    let formatTime = date.Format("yyyyMMddhhmmssSSS");
    // bf = "1649949705555"
    // timestamp = "20220414232145555"
    key = await algo[params.code].enCryptMethodJD(algo[params.code].token, algo[params.code].fingerprint, formatTime, params.code, CryptoJS).toString();
    SHA256 = await getSHA256(key, params);

    return `${formatTime};${algo[params.code].fingerprint};${params.code};${algo[params.code].token};${SHA256};3.0;${timeStamp}`
}
function getSHA256(key, params) {
    let SHA256 = CryptoJS.SHA256(JSON.stringify(params.body)).toString()
    let stringSign = `appid:${params.appid}&body:${SHA256}&client:${params.client}&clientVersion:${params.clientVersion}&functionId:${params.functionId}&t:${params.t}`
    let hash = CryptoJS.HmacSHA256(stringSign, key);
    let hashInHex = CryptoJS.enc.Hex.stringify(hash);

    return hashInHex;
}
// md5
!function (n) { function t(n, t) { var r = (65535 & n) + (65535 & t); return (n >> 16) + (t >> 16) + (r >> 16) << 16 | 65535 & r } function r(n, t) { return n << t | n >>> 32 - t } function e(n, e, o, u, c, f) { return t(r(t(t(e, n), t(u, f)), c), o) } function o(n, t, r, o, u, c, f) { return e(t & r | ~t & o, n, t, u, c, f) } function u(n, t, r, o, u, c, f) { return e(t & o | r & ~o, n, t, u, c, f) } function c(n, t, r, o, u, c, f) { return e(t ^ r ^ o, n, t, u, c, f) } function f(n, t, r, o, u, c, f) { return e(r ^ (t | ~o), n, t, u, c, f) } function i(n, r) { n[r >> 5] |= 128 << r % 32, n[14 + (r + 64 >>> 9 << 4)] = r; var e, i, a, d, h, l = 1732584193, g = -271733879, v = -1732584194, m = 271733878; for (e = 0; e < n.length; e += 16) { i = l, a = g, d = v, h = m, g = f(g = f(g = f(g = f(g = c(g = c(g = c(g = c(g = u(g = u(g = u(g = u(g = o(g = o(g = o(g = o(g, v = o(v, m = o(m, l = o(l, g, v, m, n[e], 7, -680876936), g, v, n[e + 1], 12, -389564586), l, g, n[e + 2], 17, 606105819), m, l, n[e + 3], 22, -1044525330), v = o(v, m = o(m, l = o(l, g, v, m, n[e + 4], 7, -176418897), g, v, n[e + 5], 12, 1200080426), l, g, n[e + 6], 17, -1473231341), m, l, n[e + 7], 22, -45705983), v = o(v, m = o(m, l = o(l, g, v, m, n[e + 8], 7, 1770035416), g, v, n[e + 9], 12, -1958414417), l, g, n[e + 10], 17, -42063), m, l, n[e + 11], 22, -1990404162), v = o(v, m = o(m, l = o(l, g, v, m, n[e + 12], 7, 1804603682), g, v, n[e + 13], 12, -40341101), l, g, n[e + 14], 17, -1502002290), m, l, n[e + 15], 22, 1236535329), v = u(v, m = u(m, l = u(l, g, v, m, n[e + 1], 5, -165796510), g, v, n[e + 6], 9, -1069501632), l, g, n[e + 11], 14, 643717713), m, l, n[e], 20, -373897302), v = u(v, m = u(m, l = u(l, g, v, m, n[e + 5], 5, -701558691), g, v, n[e + 10], 9, 38016083), l, g, n[e + 15], 14, -660478335), m, l, n[e + 4], 20, -405537848), v = u(v, m = u(m, l = u(l, g, v, m, n[e + 9], 5, 568446438), g, v, n[e + 14], 9, -1019803690), l, g, n[e + 3], 14, -187363961), m, l, n[e + 8], 20, 1163531501), v = u(v, m = u(m, l = u(l, g, v, m, n[e + 13], 5, -1444681467), g, v, n[e + 2], 9, -51403784), l, g, n[e + 7], 14, 1735328473), m, l, n[e + 12], 20, -1926607734), v = c(v, m = c(m, l = c(l, g, v, m, n[e + 5], 4, -378558), g, v, n[e + 8], 11, -2022574463), l, g, n[e + 11], 16, 1839030562), m, l, n[e + 14], 23, -35309556), v = c(v, m = c(m, l = c(l, g, v, m, n[e + 1], 4, -1530992060), g, v, n[e + 4], 11, 1272893353), l, g, n[e + 7], 16, -155497632), m, l, n[e + 10], 23, -1094730640), v = c(v, m = c(m, l = c(l, g, v, m, n[e + 13], 4, 681279174), g, v, n[e], 11, -358537222), l, g, n[e + 3], 16, -722521979), m, l, n[e + 6], 23, 76029189), v = c(v, m = c(m, l = c(l, g, v, m, n[e + 9], 4, -640364487), g, v, n[e + 12], 11, -421815835), l, g, n[e + 15], 16, 530742520), m, l, n[e + 2], 23, -995338651), v = f(v, m = f(m, l = f(l, g, v, m, n[e], 6, -198630844), g, v, n[e + 7], 10, 1126891415), l, g, n[e + 14], 15, -1416354905), m, l, n[e + 5], 21, -57434055), v = f(v, m = f(m, l = f(l, g, v, m, n[e + 12], 6, 1700485571), g, v, n[e + 3], 10, -1894986606), l, g, n[e + 10], 15, -1051523), m, l, n[e + 1], 21, -2054922799), v = f(v, m = f(m, l = f(l, g, v, m, n[e + 8], 6, 1873313359), g, v, n[e + 15], 10, -30611744), l, g, n[e + 6], 15, -1560198380), m, l, n[e + 13], 21, 1309151649), v = f(v, m = f(m, l = f(l, g, v, m, n[e + 4], 6, -145523070), g, v, n[e + 11], 10, -1120210379), l, g, n[e + 2], 15, 718787259), m, l, n[e + 9], 21, -343485551), l = t(l, i), g = t(g, a), v = t(v, d), m = t(m, h) } return [l, g, v, m] } function a(n) { var t, r = "", e = 32 * n.length; for (t = 0; t < e; t += 8) { r += String.fromCharCode(n[t >> 5] >>> t % 32 & 255) } return r } function d(n) { var t, r = []; for (r[(n.length >> 2) - 1] = void 0, t = 0; t < r.length; t += 1) { r[t] = 0 } var e = 8 * n.length; for (t = 0; t < e; t += 8) { r[t >> 5] |= (255 & n.charCodeAt(t / 8)) << t % 32 } return r } function h(n) { return a(i(d(n), 8 * n.length)) } function l(n, t) { var r, e, o = d(n), u = [], c = []; for (u[15] = c[15] = void 0, o.length > 16 && (o = i(o, 8 * n.length)), r = 0; r < 16; r += 1) { u[r] = 909522486 ^ o[r], c[r] = 1549556828 ^ o[r] } return e = i(u.concat(d(t)), 512 + 8 * t.length), a(i(c.concat(e), 640)) } function g(n) { var t, r, e = ""; for (r = 0; r < n.length; r += 1) { t = n.charCodeAt(r), e += "0123456789abcdef".charAt(t >>> 4 & 15) + "0123456789abcdef".charAt(15 & t) } return e } function v(n) { return unescape(encodeURIComponent(n)) } function m(n) { return h(v(n)) } function p(n) { return g(m(n)) } function s(n, t) { return l(v(n), v(t)) } function C(n, t) { return g(s(n, t)) } function A(n, t, r) { return t ? r ? s(t, n) : C(t, n) : r ? m(n) : p(n) } $.md5 = A }(this);
// prettier-ignore
function Env(t, e) { "undefined" != typeof process && JSON.stringify(process.env).indexOf("GITHUB") > -1 && process.exit(0); class s { constructor(t) { this.env = t } send(t, e = "GET") { t = "string" == typeof t ? { url: t } : t; let s = this.get; return "POST" === e && (s = this.post), new Promise((e, i) => { s.call(this, t, (t, s, r) => { t ? i(t) : e(s) }) }) } get(t) { return this.send.call(this.env, t) } post(t) { return this.send.call(this.env, t, "POST") } } return new class { constructor(t, e) { this.name = t, this.http = new s(this), this.data = null, this.dataFile = "box.dat", this.logs = [], this.isMute = !1, this.isNeedRewrite = !1, this.logSeparator = "\n", this.startTime = (new Date).getTime(), Object.assign(this, e), this.log("", `🔔${this.name}, 开始!`) } isNode() { return "undefined" != typeof module && !!module.exports } isQuanX() { return "undefined" != typeof $task } isSurge() { return "undefined" != typeof $httpClient && "undefined" == typeof $loon } isLoon() { return "undefined" != typeof $loon } toObj(t, e = null) { try { return JSON.parse(t) } catch { return e } } toStr(t, e = null) { try { return JSON.stringify(t) } catch { return e } } getjson(t, e) { let s = e; const i = this.getdata(t); if (i) try { s = JSON.parse(this.getdata(t)) } catch { } return s } setjson(t, e) { try { return this.setdata(JSON.stringify(t), e) } catch { return !1 } } getScript(t) { return new Promise(e => { this.get({ url: t }, (t, s, i) => e(i)) }) } runScript(t, e) { return new Promise(s => { let i = this.getdata("@chavy_boxjs_userCfgs.httpapi"); i = i ? i.replace(/\n/g, "").trim() : i; let r = this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout"); r = r ? 1 * r : 20, r = e && e.timeout ? e.timeout : r; const [o, h] = i.split("@"), n = { url: `http://${h}/v1/scripting/evaluate`, body: { script_text: t, mock_type: "cron", timeout: r }, headers: { "X-Key": o, Accept: "*/*" } }; this.post(n, (t, e, i) => s(i)) }).catch(t => this.logErr(t)) } loaddata() { if (!this.isNode()) return {}; { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e); if (!s && !i) return {}; { const i = s ? t : e; try { return JSON.parse(this.fs.readFileSync(i)) } catch (t) { return {} } } } } writedata() { if (this.isNode()) { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e), r = JSON.stringify(this.data); s ? this.fs.writeFileSync(t, r) : i ? this.fs.writeFileSync(e, r) : this.fs.writeFileSync(t, r) } } lodash_get(t, e, s) { const i = e.replace(/\[(\d+)\]/g, ".$1").split("."); let r = t; for (const t of i) if (r = Object(r)[t], void 0 === r) return s; return r } lodash_set(t, e, s) { return Object(t) !== t ? t : (Array.isArray(e) || (e = e.toString().match(/[^.[\]]+/g) || []), e.slice(0, -1).reduce((t, s, i) => Object(t[s]) === t[s] ? t[s] : t[s] = Math.abs(e[i + 1]) >> 0 == +e[i + 1] ? [] : {}, t)[e[e.length - 1]] = s, t) } getdata(t) { let e = this.getval(t); if (/^@/.test(t)) { const [, s, i] = /^@(.*?)\.(.*?)$/.exec(t), r = s ? this.getval(s) : ""; if (r) try { const t = JSON.parse(r); e = t ? this.lodash_get(t, i, "") : e } catch (t) { e = "" } } return e } setdata(t, e) { let s = !1; if (/^@/.test(e)) { const [, i, r] = /^@(.*?)\.(.*?)$/.exec(e), o = this.getval(i), h = i ? "null" === o ? null : o || "{}" : "{}"; try { const e = JSON.parse(h); this.lodash_set(e, r, t), s = this.setval(JSON.stringify(e), i) } catch (e) { const o = {}; this.lodash_set(o, r, t), s = this.setval(JSON.stringify(o), i) } } else s = this.setval(t, e); return s } getval(t) { return this.isSurge() || this.isLoon() ? $persistentStore.read(t) : this.isQuanX() ? $prefs.valueForKey(t) : this.isNode() ? (this.data = this.loaddata(), this.data[t]) : this.data && this.data[t] || null } setval(t, e) { return this.isSurge() || this.isLoon() ? $persistentStore.write(t, e) : this.isQuanX() ? $prefs.setValueForKey(t, e) : this.isNode() ? (this.data = this.loaddata(), this.data[e] = t, this.writedata(), !0) : this.data && this.data[e] || null } initGotEnv(t) { this.got = this.got ? this.got : require("got"), this.cktough = this.cktough ? this.cktough : require("tough-cookie"), this.ckjar = this.ckjar ? this.ckjar : new this.cktough.CookieJar, t && (t.headers = t.headers ? t.headers : {}, void 0 === t.headers.Cookie && void 0 === t.cookieJar && (t.cookieJar = this.ckjar)) } get(t, e = (() => { })) { t.headers && (delete t.headers["Content-Type"], delete t.headers["Content-Length"]), this.isSurge() || this.isLoon() ? (this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.get(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i) })) : this.isQuanX() ? (this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t))) : this.isNode() && (this.initGotEnv(t), this.got(t).on("redirect", (t, e) => { try { if (t.headers["set-cookie"]) { const s = t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString(); s && this.ckjar.setCookieSync(s, null), e.cookieJar = this.ckjar } } catch (t) { this.logErr(t) } }).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => { const { message: s, response: i } = t; e(s, i, i && i.body) })) } post(t, e = (() => { })) { if (t.body && t.headers && !t.headers["Content-Type"] && (t.headers["Content-Type"] = "application/x-www-form-urlencoded"), t.headers && delete t.headers["Content-Length"], this.isSurge() || this.isLoon()) this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.post(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i) }); else if (this.isQuanX()) t.method = "POST", this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t)); else if (this.isNode()) { this.initGotEnv(t); const { url: s, ...i } = t; this.got.post(s, i).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => { const { message: s, response: i } = t; e(s, i, i && i.body) }) } } time(t, e = null) { const s = e ? new Date(e) : new Date; let i = { "M+": s.getMonth() + 1, "d+": s.getDate(), "H+": s.getHours(), "m+": s.getMinutes(), "s+": s.getSeconds(), "q+": Math.floor((s.getMonth() + 3) / 3), S: s.getMilliseconds() }; /(y+)/.test(t) && (t = t.replace(RegExp.$1, (s.getFullYear() + "").substr(4 - RegExp.$1.length))); for (let e in i) new RegExp("(" + e + ")").test(t) && (t = t.replace(RegExp.$1, 1 == RegExp.$1.length ? i[e] : ("00" + i[e]).substr(("" + i[e]).length))); return t } msg(e = t, s = "", i = "", r) { const o = t => { if (!t) return t; if ("string" == typeof t) return this.isLoon() ? t : this.isQuanX() ? { "open-url": t } : this.isSurge() ? { url: t } : void 0; if ("object" == typeof t) { if (this.isLoon()) { let e = t.openUrl || t.url || t["open-url"], s = t.mediaUrl || t["media-url"]; return { openUrl: e, mediaUrl: s } } if (this.isQuanX()) { let e = t["open-url"] || t.url || t.openUrl, s = t["media-url"] || t.mediaUrl; return { "open-url": e, "media-url": s } } if (this.isSurge()) { let e = t.url || t.openUrl || t["open-url"]; return { url: e } } } }; if (this.isMute || (this.isSurge() || this.isLoon() ? $notification.post(e, s, i, o(r)) : this.isQuanX() && $notify(e, s, i, o(r))), !this.isMuteLog) { let t = ["", "==============📣系统通知📣=============="]; t.push(e), s && t.push(s), i && t.push(i), console.log(t.join("\n")), this.logs = this.logs.concat(t) } } log(...t) { t.length > 0 && (this.logs = [...this.logs, ...t]), console.log(t.join(this.logSeparator)) } logErr(t, e) { const s = !this.isSurge() && !this.isQuanX() && !this.isLoon(); s ? this.log("", `❗️${this.name}, 错误!`, t.stack) : this.log("", `❗️${this.name}, 错误!`, t) } wait(t) { return new Promise(e => setTimeout(e, t)) } done(t = {}) { const e = (new Date).getTime(), s = (e - this.startTime) / 1e3; this.log("", `🔔${this.name}, 结束! 🕛 ${s} 秒`), this.log(), (this.isSurge() || this.isQuanX() || this.isLoon()) && $done(t) } }(t, e) }
