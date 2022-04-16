// 生成32位随机uuid
let getUUID = function (x = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", t = 0) {
    return x.replace(/[xy]/g, function (x) {
        const r = 16 * Math.random() | 0, n = "x" === x ? r : 3 & r | 8;
        return t ? n.toString(36).toUpperCase() : n.toString(36)
    })
}

// 获取uri中指定字段的值
let queryString = function (query, name) {
    let reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)");
    let r = query.match(reg);
    if (r != null) {
        return r[2]
    } else {
        return null
    }
}

module.exports.getUUID = getUUID
module.exports.queryString = queryString
