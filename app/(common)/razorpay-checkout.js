import React, { useMemo } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function RazorpayCheckout() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { order_id, key_id, amount, name, description, student_id } = params;

  const html = useMemo(() => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
      </head>
      <body>
        <script>
          (function(){
            var options = {
              key: '${key_id}',
              amount: '${amount}',
              currency: 'INR',
              name: '${name || 'TN HappyKids'}',
              description: '${description || 'Fees Payment'}',
              order_id: '${order_id}',
              theme: { color: '#8B5CF6' },
              handler: function (response){
                const payload = {
                  success: true,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature,
                  student_id: '${student_id}',
                  amount: '${amount}'
                };
                window.ReactNativeWebView.postMessage(JSON.stringify(payload));
              },
              modal: {
                ondismiss: function(){
                  window.ReactNativeWebView.postMessage(JSON.stringify({ success: false, cancelled: true }));
                }
              },
              prefill: {},
              notes: { student_id: '${student_id}' }
            };
            var rzp = new Razorpay(options);
            rzp.open();
          })();
        </script>
      </body>
    </html>
  `, [order_id, key_id, amount, name, description, student_id]);

  const onMessage = async (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.success) {
        router.back();
      } else {
        router.back();
      }
    } catch (e) {
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <WebView originWhitelist={["*"]} source={{ html }} onMessage={onMessage} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }
});


