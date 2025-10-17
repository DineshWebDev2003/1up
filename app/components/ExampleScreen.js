import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import Background from './Background';
import Header from './Header';
import Card from './Card';
import Button from './Button';
import Input from './Input';
import ActionButton from './ActionButton';
import FloatingActionButton from './FloatingActionButton';
import Colors from '../constants/colors';
import Theme from '../constants/theme';

const ExampleScreen = ({ navigation }) => {
  return (
    <Background variant="sunrise">
      <SafeAreaView style={styles.container}>
        <Header 
          title="Happy Kids Playschool"
          subtitle="Welcome to our colorful world!"
          rightIcon="notifications"
          onRightPress={() => console.log('Notifications pressed')}
        />
        
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Welcome Card */}
          <Card variant="playful" style={styles.welcomeCard}>
            <Text style={styles.welcomeTitle}>🌟 Welcome Back!</Text>
            <Text style={styles.welcomeText}>
              Ready for another day of fun learning and adventures?
            </Text>
          </Card>

          {/* Quick Actions Grid */}
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <ActionButton
              icon="school"
              title="Classes"
              variant="primary"
              index={0}
              onPress={() => console.log('Classes pressed')}
            />
            <ActionButton
              icon="people"
              title="Students"
              variant="secondary"
              index={1}
              onPress={() => console.log('Students pressed')}
            />
            <ActionButton
              icon="event"
              title="Events"
              variant="warning"
              index={2}
              onPress={() => console.log('Events pressed')}
            />
            <ActionButton
              icon="assessment"
              title="Reports"
              variant="info"
              index={3}
              onPress={() => console.log('Reports pressed')}
            />
            <ActionButton
              icon="payment"
              title="Payments"
              variant="success"
              index={4}
              onPress={() => console.log('Payments pressed')}
            />
            <ActionButton
              icon="settings"
              title="Settings"
              variant="purple"
              index={5}
              onPress={() => console.log('Settings pressed')}
            />
          </View>

          {/* Statistics Cards */}
          <Text style={styles.sectionTitle}>Today's Overview</Text>
          <View style={styles.statsContainer}>
            <Card variant="elevated" style={styles.statCard}>
              <Text style={styles.statNumber}>156</Text>
              <Text style={styles.statLabel}>Total Students</Text>
            </Card>
            <Card variant="elevated" style={styles.statCard}>
              <Text style={[styles.statNumber, { color: Colors.success }]}>98%</Text>
              <Text style={styles.statLabel}>Attendance</Text>
            </Card>
          </View>

          {/* Sample Form */}
          <Card variant="default" style={styles.formCard}>
            <Text style={styles.formTitle}>Quick Message</Text>
            <Input
              label="Message Title"
              placeholder="Enter message title..."
              leftIcon="mail"
            />
            <Input
              label="Message Content"
              placeholder="Type your message here..."
              multiline
              numberOfLines={3}
            />
            <Button
              title="Send Message"
              variant="primary"
              fullWidth
              onPress={() => console.log('Message sent')}
            />
          </Card>

          {/* Color Palette Showcase */}
          <Text style={styles.sectionTitle}>Color Palette</Text>
          <View style={styles.colorGrid}>
            <View style={[styles.colorBox, { backgroundColor: Colors.primary }]}>
              <Text style={styles.colorText}>Primary</Text>
            </View>
            <View style={[styles.colorBox, { backgroundColor: Colors.secondary }]}>
              <Text style={styles.colorText}>Secondary</Text>
            </View>
            <View style={[styles.colorBox, { backgroundColor: Colors.accent }]}>
              <Text style={styles.colorText}>Accent</Text>
            </View>
            <View style={[styles.colorBox, { backgroundColor: Colors.success }]}>
              <Text style={styles.colorText}>Success</Text>
            </View>
            <View style={[styles.colorBox, { backgroundColor: Colors.warning }]}>
              <Text style={styles.colorText}>Warning</Text>
            </View>
            <View style={[styles.colorBox, { backgroundColor: Colors.danger }]}>
              <Text style={styles.colorText}>Danger</Text>
            </View>
          </View>

          {/* Button Variants */}
          <Text style={styles.sectionTitle}>Button Styles</Text>
          <View style={styles.buttonContainer}>
            <Button title="Primary Button" variant="primary" style={styles.button} />
            <Button title="Secondary Button" variant="secondary" style={styles.button} />
            <Button title="Outline Button" variant="outline" style={styles.button} />
            <Button title="Ghost Button" variant="ghost" style={styles.button} />
          </View>

          <View style={styles.bottomSpacing} />
        </ScrollView>

        <FloatingActionButton
          icon="add"
          onPress={() => console.log('FAB pressed')}
        />
      </SafeAreaView>
    </Background>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Theme.spacing.md,
  },
  welcomeCard: {
    marginBottom: Theme.spacing.lg,
  },
  welcomeTitle: {
    ...Theme.typography.h4,
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: Theme.spacing.sm,
  },
  welcomeText: {
    ...Theme.typography.body1,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  sectionTitle: {
    ...Theme.typography.h5,
    color: Colors.text,
    marginBottom: Theme.spacing.md,
    marginTop: Theme.spacing.lg,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.lg,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.lg,
  },
  statCard: {
    flex: 1,
    marginHorizontal: Theme.spacing.xs,
    alignItems: 'center',
    paddingVertical: Theme.spacing.lg,
  },
  statNumber: {
    ...Theme.typography.h2,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  statLabel: {
    ...Theme.typography.caption,
    color: Colors.textSecondary,
    marginTop: Theme.spacing.xs,
  },
  formCard: {
    marginBottom: Theme.spacing.lg,
  },
  formTitle: {
    ...Theme.typography.h5,
    color: Colors.text,
    marginBottom: Theme.spacing.md,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.lg,
  },
  colorBox: {
    width: '30%',
    height: 60,
    borderRadius: Theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  colorText: {
    color: Colors.textOnPrimary,
    fontWeight: '600',
    fontSize: 12,
  },
  buttonContainer: {
    marginBottom: Theme.spacing.lg,
  },
  button: {
    marginBottom: Theme.spacing.sm,
  },
  bottomSpacing: {
    height: 100,
  },
});

export default ExampleScreen;
