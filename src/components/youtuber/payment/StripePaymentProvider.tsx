//src/components/youtuber/payment/StripePaymentProvider.tsx
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe, Appearance } from '@stripe/stripe-js';
import PaymentForm from './PaymentForm';

const stripePromise = loadStripe(process.env.VITE_STRIPE_PUBLISHABLE_KEY!);

interface StripePaymentProviderProps {
  clientSecret: string;
  slotId: string;
  price: number;
  duration: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function StripePaymentProvider({
  clientSecret,
  slotId,
  price,
  duration,
  onSuccess,
  onCancel
}: StripePaymentProviderProps) {
  const appearance: Appearance = {
    theme: 'stripe',
    variables: {
      colorPrimary: '#4F46E5',
      colorBackground: '#ffffff',
      colorText: '#1F2937',
    },
  };

  return (
    <Elements 
      stripe={stripePromise} 
      options={{
        clientSecret,
        appearance,
      }}
    >
      <PaymentForm
        slotId={slotId}
        price={price}
        duration={duration}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    </Elements>
  );
}