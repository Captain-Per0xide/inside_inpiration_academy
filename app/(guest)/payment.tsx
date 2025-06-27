import PaymentComponent from "@/components/payment";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";

const PaymentScreen = () => {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();

  const handlePaymentSuccess = () => {
    router.push("/(guest)");
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

export default PaymentScreen;
