// This controller provides the data the form needs initially.
const getTeacherProfile = (req, res) => {
    // req.user is attached by the verifyToken middleware.
    // We simply send back the userDetails part of the token.
    if (req.user && req.user.userDetails) {
        res.status(200).json(req.user.userDetails);
    } else {
        res.status(404).json({ message: 'Teacher details not found in token.' });
    }
};

module.exports = { getTeacherProfile };