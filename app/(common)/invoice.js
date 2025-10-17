import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

const InfoRow = ({ label, value }) => (
    <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>{label}:</Text>
        <Text style={styles.infoValue}>{value}</Text>
    </View>
);

export default function Invoice({ transaction, branchDetails }) {
    if (!transaction) return null;

    const sonOf = transaction.sonOf || 'GOPINATH T'; // Placeholder
    const voucherNo = `TNHK${String(transaction.id || '001').padStart(3, '0')}`;
    const transactionId = transaction.transactionId || '-';

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Image source={transaction.photo} style={styles.logo} />
                <Text style={styles.headerText}>TN HAPPYKIDS <Text style={styles.branchText}>{(transaction.branch || '').toUpperCase()}</Text></Text>
                <View style={styles.headerCircles}>
                    <View style={[styles.circle, { backgroundColor: '#E91E63' }]} />
                    <View style={[styles.circle, { backgroundColor: '#4CAF50' }]} />
                    <View style={[styles.circle, { backgroundColor: '#FFEB3B' }]} />
                </View>
            </View>

            <View style={styles.body}>
                <View style={styles.watermarkContainer}><Image source={require('../../assets/logo.png')} style={styles.watermarkImage} /></View>
                <Text style={styles.title}>BILL VOUCHER-ADMISSION FEES</Text>
                <View style={styles.voucherDetails}>
                    <Text style={styles.detailText}>VOUCHER NO: {voucherNo}</Text>
                    <Text style={styles.detailText}>DATE: {transaction.date}</Text>
                </View>

                <InfoRow label="STUDENT NAME" value={transaction.studentName} />
                <InfoRow label="SON OF" value={sonOf} />
                <InfoRow label="PARTICULARS" value="ADMISSION FEES" />
                <InfoRow label="AMOUNT" value={`INR ${transaction.amount}/-`} />
                <InfoRow label="MODE OF PAYMENT" value={transaction.paymentMethod} />
                <InfoRow label="TRANSACTION ID" value={transactionId} />

                <View style={styles.receivedContainer}>
                    <Text style={styles.asterisk}>*</Text>
                    <Text style={styles.receivedText}>Received with thanks</Text>
                    <Text style={styles.asterisk}>*</Text>
                </View>

                <View style={styles.signatureContainer}>
                    <View style={styles.signatureLine} />
                    <Text style={styles.signatureText}>AUTHORIZED SIGNATURE</Text>
                </View>
            </View>

            <View style={styles.footer}>
                <Text style={styles.footerTitle}>ADDRESS</Text>
                <Text style={styles.footerText}>{branchDetails?.address}</Text>
                <Text style={styles.footerTitle}>CONTACT: <Text style={styles.footerText}>{branchDetails?.contact}</Text></Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#E91E63', margin: 10, borderRadius: 5 },
    header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E91E63', padding: 10 },
    logo: { width: 40, height: 40, borderRadius: 20 },
    headerText: { flex: 1, textAlign: 'center', color: 'white', fontSize: 18, fontWeight: 'bold' },
    branchText: { color: '#C5E1A5' },
    headerCircles: { flexDirection: 'row' },
    circle: { width: 12, height: 12, borderRadius: 6, marginLeft: 4 },
    body: { padding: 20 },
    title: { textAlign: 'center', fontWeight: 'bold', fontSize: 16, textDecorationLine: 'underline', marginBottom: 15 },
    voucherDetails: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
    detailText: { fontSize: 12 },
    infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    infoLabel: { fontWeight: 'bold', color: '#4CAF50', fontSize: 12, width: 120 },
    infoValue: { fontSize: 12, flex: 1 },
    receivedContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFEB3B', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20, alignSelf: 'center', marginVertical: 20 },
    receivedText: { fontWeight: 'bold', marginHorizontal: 10 },
    asterisk: { fontSize: 20, fontWeight: 'bold', color: '#000' },
    signatureContainer: { alignItems: 'center', marginTop: 20 },
    signatureLine: { borderTopWidth: 1, borderColor: '#000', width: '60%', marginBottom: 5 },
    signatureText: { fontWeight: 'bold' },
    footer: { backgroundColor: '#E91E63', padding: 15 },
    footerTitle: { color: 'white', fontWeight: 'bold' },
    footerText: { color: 'white' },
    watermarkContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
    watermark: { position: 'absolute', width: 250, height: 250, top: '50%', left: '50%', transform: [{ translateX: -125 }, { translateY: -125 }], opacity: 0.05, borderRadius: 0 },
    watermarkImage: { width: 250, height: 250, opacity: 0.05 },
});
