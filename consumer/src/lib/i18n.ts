import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';

// translation resources
const resources = {
    en: {
        translation: {
            "search_placeholder": "Search for a place or facility",
            "photo_spots": "Photo Spots",
            "facilities": "Facilities",
            "all_places": "All Places",
            "search_no_results": "No results for \"{{query}}\"",
            "end_walk": "END",
            "remaining_distance": "{{distance}}m remaining",
            "ar_mode": "AR",
            "map_mode": "Map",
            "claim": "Claim",
            "golden_stamp": "Golden Stamp",
            "poi_info": {
                "famous_for": "Why it's famous",
                "photo_spot": "Best photo spot",
                "crowded": "How crowded",
                "facts": "Interesting facts",
                "history": "History"
            },
            "share_run": "Share Run",
            "expedition_complete": "Expedition Complete",
            "your_journey": "Your Journey",
            "steps": "Steps",
            "kilometers": "Kilometers",
            "calories": "Calories",
            "stamps": "Stamps",
            "duration": "Duration",
            "enable_compass": "Enable Compass",
            "compass_desc": "We need access to your device's orientation sensor to guide you accurately.",
            "grant_permission": "Grant Permission",
            "calibrating": "Calibrating",
            "connecting_gps": "Connecting GPS...",
            "accuracy": "Accuracy: {{acc}}m",
            "move_8_calibrate": "Move in 8 to calibrate",
            "stamp_nearby": "Stamp Nearby!",
            "claim_stamp": "Claim Stamp",
            "claimed": "Claimed!",
            "share_triumph": "Share Triumph",
            "continue_journey": "Continue Journey",
            "navigate_here": "Navigate Here"
        }
    },
    kn: {
        translation: {
            "search_placeholder": "ಸ್ಥಳ ಅಥವಾ ಸೌಕರ್ಯವನ್ನು ಹುಡುಕಿ",
            "photo_spots": "ಫೋಟೋ ಸ್ಪಾಟ್‌ಗಳು",
            "facilities": "ಸೌಲಭ್ಯಗಳು",
            "all_places": "ಎಲ್ಲಾ ಸ್ಥಳಗಳು",
            "search_no_results": "\"{{query}}\" ಗಾಗಿ ಯಾವುದೇ ಫಲಿತಾಂಶಗಳಿಲ್ಲ",
            "end_walk": "ಮುಕ್ತಾಯ",
            "remaining_distance": "{{distance}}m ಬಾಕಿ ಇದೆ",
            "ar_mode": "AR (ಏಆರ್)",
            "map_mode": "ನಕ್ಷೆ",
            "claim": "ಪಡೆಯಿರಿ",
            "golden_stamp": "ಸುವರ್ಣ ಸ್ಟ್ಯಾಂಪ್",
            "poi_info": {
                "famous_for": "ಇದು ಏಕೆ ಪ್ರಸಿದ್ಧವಾಗಿದೆ",
                "photo_spot": "ಅತ್ಯುತ್ತಮ ಫೋಟೋ ಸ್ಪಾಟ್",
                "crowded": "ಎಷ್ಟು ಜನಸಂದಣಿ ಇದೆ",
                "facts": "ಕುತೂಹಲಕಾರಿ ಸಂಗತಿಗಳು",
                "history": "ಇತಿಹಾಸ"
            },
            "share_run": "ಹಂಚಿಕೊಳ್ಳಿ",
            "expedition_complete": "ಯಾತ್ರೆ ಪೂರ್ಣಗೊಂಡಿದೆ",
            "your_journey": "ನಿಮ್ಮ ಪ್ರಯಾಣ",
            "steps": "ಹೆಜ್ಜೆಗಳು",
            "kilometers": "ಕಿಲೋಮೀಟರ್",
            "calories": "ಕ್ಯಾಲೋರಿಗಳು",
            "stamps": "ಸ್ಟ್ಯಾಂಪ್‌ಗಳು",
            "duration": "ಅವಧಿ",
            "enable_compass": "ದಿಕ್ಸೂಚಿ ಸಕ್ರಿಯಗೊಳಿಸಿ",
            "compass_desc": "ನಿಮ್ಮನ್ನು ನಿಖರವಾಗಿ ಮಾರ್ಗದರ್ಶನ ಮಾಡಲು ನಿಮ್ಮ ಸಾಧನದ ದಿಕ್ಸೂಚಿ ಸಂವೇದಕಕ್ಕೆ ಪ್ರವೇಶದ ಅಗತ್ಯವಿದೆ.",
            "grant_permission": "ಅನುಮತಿ ನೀಡಿ",
            "calibrating": "ಮಾಪನಾಂಕ ಮಾಡಲಾಗುತ್ತಿದೆ",
            "connecting_gps": "GPS ಸಂಪರ್ಕಿಸಲಾಗುತ್ತಿದೆ...",
            "accuracy": "ನಿಖರತೆ: {{acc}}m",
            "move_8_calibrate": "ಕ್ಯಾಲಿಬ್ರೇಟ್ ಮಾಡಲು 8 ರಲ್ಲಿ ಸರಿಸಿ",
            "stamp_nearby": "ಸ್ಟ್ಯಾಂಪ್ ಹತ್ತಿರದಲ್ಲಿದೆ!",
            "claim_stamp": "ಸ್ಟ್ಯಾಂಪ್ ಪಡೆಯಿರಿ",
            "claimed": "ಪಡೆಯಲಾಗಿದೆ!",
            "share_triumph": "ಗೆಲುವನ್ನು ಹಂಚಿಕೊಳ್ಳಿ",
            "continue_journey": "ಪ್ರಯಾಣ ಮುಂದುವರಿಸಿ",
            "navigate_here": "ಇಲ್ಲಿಗೆ ನ್ಯಾವಿಗೇಟ್ ಮಾಡಿ"
        }
    }
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: "en", // default language
        fallbackLng: "en",
        interpolation: {
            escapeValue: false // react already safes from xss
        }
    });

export default i18n;
