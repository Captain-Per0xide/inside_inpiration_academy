import Svg, { Path } from "react-native-svg";
export default function CodingLeagueIcon({ stroke = "#000000"}) {
    return (
        <Svg width="35" height="35" viewBox="0 0 35 35" fill="none">
            <Path d="M26.25 23.3334L32.0833 17.5001L26.25 11.6667" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M8.75 11.6667L2.91666 17.5001L8.75 23.3334" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M21.1458 5.83325L13.8542 29.1666" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}