const settingsService = require('./settings.service');

const getSetting = async (req, res) => {
    try {
        const setting = await settingsService.getDisplayAnswersSetting();
        res.status(200).json(setting);
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching setting.' });
    }
};

const updateSetting = async (req, res) => {
    try {
        const { isEnabled } = req.body;
        if (typeof isEnabled !== 'boolean') {
            return res.status(400).json({ message: 'Invalid data: isEnabled must be a boolean.' });
        }
        const updatedSetting = await settingsService.updateDisplayAnswersSetting(isEnabled);
        res.status(200).json(updatedSetting);
    } catch (error) {
        res.status(500).json({ message: 'Server error updating setting.' });
    }
};

module.exports = { getSetting, updateSetting };