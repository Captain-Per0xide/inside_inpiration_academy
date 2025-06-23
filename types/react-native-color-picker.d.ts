declare module 'react-native-wheel-color-picker' {
    import { Component } from 'react';
    
    interface ColorPickerProps {
        color: string;
        onColorChange: (color: string) => void;
        thumbSize?: number;
        sliderSize?: number;
        noSnap?: boolean;
        row?: boolean;
        palette?: string[];
    }
    
    export default class ColorPicker extends Component<ColorPickerProps> {}
}