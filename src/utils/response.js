module.exports = {
success: (res, message, data = {}) => {
return res.status(200).json({ status: true, message, data });
},
error: (res, message, code = 400) => {
return res.status(code).json({ status: false, message });
},
};