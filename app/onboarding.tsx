import { useRouter } from 'expo-router';
import React from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  SafeAreaView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import tw from 'twrnc';

// Import images
import onboarding1 from '../assets/images/onboarding_1-bg-removed.png';
import onboarding2 from '../assets/images/onboarding_2-bg-removed.png';
import onboarding3 from '../assets/images/onboarding_3-bg-removed.png';

const {width, height} = Dimensions.get('window');

const slides = [
  {
    id: '1',
    image: onboarding1,
    title: 'Master the Foundations',
    subtitle: 'Inside Inspiration Academy emphasizes fundamental computer science for innovation, ensuring solid understanding for future success.',
  },
  {
    id: '2',
    image: onboarding2,
    title: 'Innovate with Cutting-Edge Tech',
    subtitle: 'Explore AI, Machine Learning, Blockchain, and Cloud Computing at Inside Inspiration Academy to become market-ready.',
  },
  {
    id: '3',
    image: onboarding3,
    title: 'Your Journey to Inspiration Starts Here',
    subtitle: 'Join Inside Inspiration Academy to blend foundational knowledge with innovation. Access tools, expertise, and inspiration for your career.',
  },
];

const Slide = ({item}: {item: typeof slides[0]}) => {
  return (
    <View style={[tw`items-center h-full justify-between py-6`, {height: height * 0.75}]}>
      <Image
        source={item?.image}
        style={[{height: '60%', width, resizeMode: 'contain'}]}
      />
      <View style={tw`items-center px-8 flex flex-col gap-3`}>
        <Text style={tw`text-white text-xl font-bold text-center text-2xl`}>{item?.title}</Text>
        <Text style={tw`text-white text-sm text-center leading-6 max-w-xs`}>{item?.subtitle}</Text>
      </View>
    </View>
  );
};

const OnboardingScreen = () => {
  const [currentSlideIndex, setCurrentSlideIndex] = React.useState(0);
  const ref = React.useRef<FlatList>(null);
  const router = useRouter();

  const updateCurrentSlideIndex = (e: any) => {
    const contentOffsetX = e.nativeEvent.contentOffset.x;
    const currentIndex = Math.round(contentOffsetX / width);
    setCurrentSlideIndex(currentIndex);
  };

  const goToNextSlide = () => {
    const nextSlideIndex = currentSlideIndex + 1;
    if (nextSlideIndex !== slides.length) {
      const offset = nextSlideIndex * width;
      ref?.current?.scrollToOffset({offset});
      setCurrentSlideIndex(currentSlideIndex + 1);
    }
  };

  const skip = () => {
    const lastSlideIndex = slides.length - 1;
    const offset = lastSlideIndex * width;
    ref?.current?.scrollToOffset({offset});
    setCurrentSlideIndex(lastSlideIndex);
  };

  const navigateToAuth = () => {
    router.push('/(auth)');
  };

  const Footer = () => {
    return (
      <View style={[tw`justify-between px-5`, {height: height * 0.15}]}>
        {/* Indicator container */}
        <View style={tw`flex-row justify-center mt-5`}>
          {/* Render indicator */}
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                tw`h-1 w-2.5 bg-gray-500 mx-1 rounded`,
                currentSlideIndex === index && tw`bg-white w-6`,
              ]}
            />
          ))}
        </View>

        {/* Render buttons */}
        <View style={tw`mb-5`}>
          {currentSlideIndex === slides.length - 1 ? (
            <View style={tw`h-12`}>
              <TouchableOpacity
                style={tw`flex-1 h-12 rounded bg-white justify-center items-center`}
                onPress={navigateToAuth}>
                <Text style={tw`font-bold text-base`}>
                  GET STARTED
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={tw`flex-row`}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={tw`flex-1 h-12 rounded border border-white bg-transparent justify-center items-center`}
                onPress={skip}>
                <Text style={tw`font-bold text-base text-white`}>
                  SKIP
                </Text>
              </TouchableOpacity>
              <View style={tw`w-4`} />
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={goToNextSlide}
                style={tw`flex-1 h-12 rounded bg-white justify-center items-center`}>
                <Text style={tw`font-bold text-base`}>
                  NEXT
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };
  return (
    <SafeAreaView style={[tw`flex-1`, {backgroundColor: '#111827'}]}>
      <StatusBar backgroundColor="#111827" />
      <FlatList
        ref={ref}
        onMomentumScrollEnd={updateCurrentSlideIndex}
        contentContainerStyle={[tw``, {height: height * 0.75}]}
        showsHorizontalScrollIndicator={false}
        horizontal
        data={slides}
        pagingEnabled
        renderItem={({item}) => <Slide item={item} />}
      />
      <Footer />
    </SafeAreaView>
  );
};

export default OnboardingScreen;
