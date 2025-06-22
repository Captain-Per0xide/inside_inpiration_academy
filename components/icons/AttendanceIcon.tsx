import Svg, { Path } from "react-native-svg";

export default function AttendanceIcon({ stroke = "#000000" }) {
    return (
        <Svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <Path d="M31.125 11.4374V9.24992C31.125 8.47637 30.8177 7.7345 30.2707 7.18752C29.7237 6.64054 28.9819 6.33325 28.2083 6.33325H7.79167C7.01812 6.33325 6.27625 6.64054 5.72927 7.18752C5.18229 7.7345 4.875 8.47637 4.875 9.24992V29.6666C4.875 30.4401 5.18229 31.182 5.72927 31.729C6.27625 32.276 7.01812 32.5833 7.79167 32.5833H12.8958" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M23.8333 3.41675V9.25008" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M12.1667 3.41675V9.25008" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M4.875 15.0833H12.1667" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M26.0208 26.0209L23.8333 24.2709V20.9167" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M23.8333 32.5833C28.6658 32.5833 32.5833 28.6657 32.5833 23.8333C32.5833 19.0008 28.6658 15.0833 23.8333 15.0833C19.0008 15.0833 15.0833 19.0008 15.0833 23.8333C15.0833 28.6657 19.0008 32.5833 23.8333 32.5833Z" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}