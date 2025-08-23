import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// This is a placeholder for the logo. Replace with your actual logo if available.
const logoPlaceholder = 'https://via.placeholder.com/50';

export default function Invoice({ transaction, branchDetails }) {
  if (!transaction) return null; // Don't render if no transaction

  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString('en-GB');
  const month = currentDate.toLocaleString('default', { month: 'long' }).toUpperCase();
  const year = currentDate.getFullYear();

  // Generate a deterministic 6-digit alphanumeric voucher number from transaction details
  const generateVoucherNo = (id) => {
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return (hash * 1234567).toString(36).substring(0, 6).toUpperCase();
  };

  const voucherNo = generateVoucherNo(transaction.id + transaction.studentId);
  const particulars = `MONTHLY FEES - ${month} ${year}`;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Image source={require('../../assets/logo.png')} style={styles.logo} />
          <View>
            <Text style={styles.headerText}>TN HAPPYKIDS</Text>
            <Text style={styles.branchText}>{transaction.branch.toUpperCase()}</Text>
          </View>
        </View>
        <View style={styles.headerCircles}>
          <View style={[styles.circle, { backgroundColor: '#E94E77' }]} />
          <View style={[styles.circle, { backgroundColor: '#5DBF79' }]} />
          <View style={[styles.circle, { backgroundColor: '#F7D05A' }]} />
        </View>
      </View>

      {/* Body */}
      <View style={styles.body}>
        <View style={styles.watermarkContainer}>
          <Image source={require('../../assets/logo.png')} style={styles.watermarkImage} />
        </View>
        <Text style={styles.title}>BILL VOUCHER - {particulars}</Text>
        <View style={styles.underline} />

        <View style={styles.voucherDetails}>
          <Text style={styles.detailLabel}>VOUCHER NO: {voucherNo}</Text>
          <Text style={styles.detailLabel}>DATE: {formattedDate}</Text>
        </View>

        <View style={styles.infoSection}>
          <InfoRow label="STUDENT NAME:" value={transaction.studentName} />
          {/* Assuming 'sonOf' is not in the data, can be added if needed */}
          <InfoRow label="PARTICULARS:" value={particulars} />
          <InfoRow label="AMOUNT:" value={`₹${transaction.amount}/-`} />
          <InfoRow label="MODE OF PAYMENT:" value={transaction.paymentMethod} />
          <InfoRow label="TRANSACTION ID:" value={transaction.id} />
        </View>

        <View style={styles.receivedContainer}>
          <Ionicons name="sparkles" size={20} color="#000" />
          <Text style={styles.receivedText}>Received with thanks</Text>
          <Ionicons name="sparkles" size={20} color="#000" />
        </View>

        <View style={styles.signatureContainer}>
          <View style={styles.signatureLine} />
          <Text style={styles.signatureText}>AUTHORIZED SIGNATURE</Text>
        </View>

        {/* Decorative side elements */}
        <View style={styles.sideDecorationLeft}>
          <View style={styles.sideCircle} />
          <View style={styles.sideLine} />
          <View style={styles.sideLine} />
          <View style={styles.sideLine} />
        </View>
        <View style={styles.sideDecorationRight}>
          <View style={styles.sideCircle} />
          <View style={styles.sideLine} />
          <View style={styles.sideLine} />
          <View style={styles.sideLine} />
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View>
          <Text style={styles.footerTitle}>ADDRESS</Text>
          <Text style={styles.footerText}>{branchDetails?.address || 'Address not available'}</Text>
        </View>
        <Text style={styles.footerContact}>CONTACT: {branchDetails?.contact || 'Contact not available'}</Text>
      </View>
    </View>
  );
}

const InfoRow = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 10, overflow: 'hidden', elevation: 5, borderWidth: 1, borderColor: '#ddd' },
  header: { backgroundColor: '#C73E63', padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerContent: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  headerText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  branchText: { color: '#fff', fontSize: 14 },
  headerCircles: { flexDirection: 'row' },
  circle: { width: 15, height: 15, borderRadius: 7.5, marginLeft: 5 },
  body: { padding: 20, paddingTop: 20, backgroundColor: 'transparent', position: 'relative' },
  title: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', color: '#333' },
  underline: { height: 1, backgroundColor: '#333', marginHorizontal: 50, marginTop: 5, marginBottom: 20 },
  voucherDetails: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  detailLabel: { fontSize: 12, color: '#555', fontWeight: '500' },
  infoSection: { marginBottom: 20 },
  infoRow: { flexDirection: 'row', marginBottom: 8 },
  infoLabel: { fontSize: 12, color: '#333', fontWeight: 'bold', width: 120 },
  infoValue: { fontSize: 12, color: '#555', flex: 1 },
  receivedContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7D05A', padding: 10, borderRadius: 20, alignSelf: 'center', marginVertical: 15 },
  receivedText: { fontWeight: 'bold', marginHorizontal: 15 },
  signatureContainer: { alignItems: 'center', marginTop: 20 },
  signatureLine: { height: 1, backgroundColor: '#333', width: '60%', marginBottom: 5 },
  signatureText: { fontSize: 12, fontWeight: 'bold', color: '#333' },
  footer: { backgroundColor: '#C73E63', padding: 15 },
  footerTitle: { color: '#fff', fontWeight: 'bold', fontSize: 14, marginBottom: 5 },
  footerText: { color: '#fff', fontSize: 12 },
  footerContact: { color: '#fff', fontWeight: 'bold', marginTop: 10, textAlign: 'right' },
  sideDecorationLeft: { position: 'absolute', left: 5, top: '50%', alignItems: 'center' },
  sideDecorationRight: { position: 'absolute', right: 5, top: '50%', alignItems: 'center' },
  sideCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#C73E63', opacity: 0.5, marginBottom: 10 },
  sideLine: { width: 1, height: 40, backgroundColor: '#555', marginBottom: 5 },
  watermarkContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  watermarkImage: {
    width: 250,
    height: 250,
    opacity: 0.05,
  },
});
