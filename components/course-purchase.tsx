import React from "react";
import PaymentComponent from "./payment";

interface CoursePurchaseProps {
  courseId: string;
  onPaymentSuccess: () => void;
  onBack: () => void;
}

const CoursePurchase = ({ courseId, onPaymentSuccess, onBack }: CoursePurchaseProps) => {
  if (!courseId) {
    return null;
  }

  return (
    <PaymentComponent
      courseId={courseId}
      onPaymentSuccess={onPaymentSuccess}
      onBack={onBack}
    />
  );
};

export default CoursePurchase;
