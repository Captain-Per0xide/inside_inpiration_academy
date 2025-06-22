import Svg, { Path } from "react-native-svg";

export default function CourseIcon({ stroke = "#000000"}) {
    return (
        <Svg width="36" height="35" viewBox="0 0 36 35" fill="none">
            <Path d="M18 10.2083V30.6249" stroke={stroke} stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
            <Path d="M23.8333 17.5H26.75" stroke={stroke} stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
            <Path d="M23.8333 11.6667H26.75" stroke={stroke} stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
            <Path d="M4.87501 26.25C4.48823 26.25 4.1173 26.0964 3.84381 25.8229C3.57032 25.5494 3.41667 25.1784 3.41667 24.7917V5.83333C3.41667 5.44656 3.57032 5.07563 3.84381 4.80214C4.1173 4.52865 4.48823 4.375 4.87501 4.375H12.1667C13.7138 4.375 15.1975 4.98958 16.2915 6.08354C17.3854 7.17751 18 8.66124 18 10.2083C18 8.66124 18.6146 7.17751 19.7085 6.08354C20.8025 4.98958 22.2862 4.375 23.8333 4.375H31.125C31.5118 4.375 31.8827 4.52865 32.1562 4.80214C32.4297 5.07563 32.5833 5.44656 32.5833 5.83333V24.7917C32.5833 25.1784 32.4297 25.5494 32.1562 25.8229C31.8827 26.0964 31.5118 26.25 31.125 26.25H22.375C21.2147 26.25 20.1019 26.7109 19.2814 27.5314C18.4609 28.3519 18 29.4647 18 30.625C18 29.4647 17.5391 28.3519 16.7186 27.5314C15.8981 26.7109 14.7853 26.25 13.625 26.25H4.87501Z" stroke={stroke} stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
            <Path d="M9.25 17.5H12.1667" stroke={stroke} stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
            <Path d="M9.25 11.6667H12.1667" stroke={stroke} stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
        </Svg>

    );
}