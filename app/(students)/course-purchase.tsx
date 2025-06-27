import PaymentComponent from "@/components/payment";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";

const CoursePurchaseScreen = () => {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();

  const handlePaymentSuccess = () => {
    // Navigate back to students dashboard after successful payment
    router.push("/(students)");
  };

  const handleBack = () => {
    router.back();
  };

  if (!courseId) {
    router.back();
    return null;
  }

  return (
    <PaymentComponent
      courseId={courseId}
      onPaymentSuccess={handlePaymentSuccess}
      onBack={handleBack}
    />
  );
};

export default CoursePurchaseScreen;
