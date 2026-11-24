import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useFonts } from 'expo-font';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { events, gallery, sampleVehicles } from './src/data';
import { backendConfigured, supabase } from './src/supabase';
import { Plan, Tab, TecEvent, Vehicle } from './src/types';

const COLORS = {
  black: '#050608', panel: '#0d1014', panel2: '#15191e', line: '#2a3038',
  white: '#f4f5f6', muted: '#9ba2aa', red: '#d0202f', redDark: '#720814', silver: '#c8ccd1'
};

type AuthMode = 'signin' | 'register';
type SessionState = 'loading' | 'signedOut' | 'signedIn';

export default function App() {
  const [fontsLoaded] = useFonts({
    TecBody: require('./assets/nimbus-sans.otf'),
    TecBodyBold: require('./assets/nimbus-sans-bold.otf')
  });
  const [sessionState, setSessionState] = useState<SessionState>('loading');
  const [showSplash, setShowSplash] = useState(true);
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [tab, setTab] = useState<Tab>('home');
  const [selectedEvent, setSelectedEvent] = useState<TecEvent | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [plans, setPlans] = useState<Record<string, Plan>>({});
  const [firstName, setFirstName] = useState('Todd');

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem('tec-plans').then(raw => {
      if (raw && active) setPlans(JSON.parse(raw));
    }).catch(() => undefined);
    if (!supabase) {
      setSessionState('signedOut');
      return () => { active = false; };
    }
    supabase.auth.getSession().then(({ data }) => {
      if (active) setSessionState(data.session ? 'signedIn' : 'signedOut');
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setSessionState(session ? 'signedIn' : 'signedOut');
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);

  const savePlan = async (id: string, plan: Plan) => {
    const next = { ...plans, [id]: plan };
    setPlans(next);
    await AsyncStorage.setItem('tec-plans', JSON.stringify(next));
  };

  const enterDemo = () => {
    setFirstName('Todd');
    setShowSplash(false);
    setSessionState('signedIn');
  };

  if (sessionState === 'loading' || !fontsLoaded) {
    return <View style={styles.loading}><StatusBar style="light" /><ActivityIndicator color={COLORS.red} size="large" /></View>;
  }

  if (showSplash) {
    return <LaunchScreen onRegister={() => { setAuthMode('register'); setShowSplash(false); }} onSignIn={() => { setAuthMode('signin'); setShowSplash(false); }} onPreview={enterDemo} />;
  }

  if (sessionState === 'signedOut') {
    return <AuthScreen mode={authMode} setMode={setAuthMode} onBack={() => setShowSplash(true)} onDemo={enterDemo} />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <Header firstName={firstName} onAccount={() => Alert.alert('Account', 'Account settings, privacy, and account deletion will live here.')} />
      <View style={styles.appBody}>
        <AppBackdrop />
        {tab === 'home' && <Home firstName={firstName} plans={plans} onEvent={setSelectedEvent} onTab={setTab} onVehicle={setSelectedVehicle} />}
        {tab === 'events' && <Events plans={plans} onEvent={setSelectedEvent} />}
        {tab === 'cruise' && <CruiseComingSoon />}
        {tab === 'garage' && <Garage onVehicle={setSelectedVehicle} />}
        {tab === 'photos' && <Photos />}
      </View>
      <TabBar tab={tab} onTab={setTab} />
      <EventModal event={selectedEvent} plan={selectedEvent ? plans[selectedEvent.id] : undefined} onPlan={savePlan} onClose={() => setSelectedEvent(null)} />
      <VehicleModal vehicle={selectedVehicle} onClose={() => setSelectedVehicle(null)} />
    </SafeAreaView>
  );
}

function AppBackdrop() {
  return (
    <View pointerEvents="none" style={styles.backdrop}>
      <LinearGradient colors={['#17191e', '#0a0c10', '#030405']} locations={[0, .48, 1]} style={styles.backdropBase} />
      <View style={styles.backdropRedGlow} />
      <View style={styles.backdropSilverGlow} />
      <LinearGradient colors={['rgba(255,255,255,.055)', 'transparent', 'rgba(126,0,10,.12)', 'transparent']} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={styles.backdropSweep} />
      <View style={styles.backdropHairline} />
    </View>
  );
}

function LaunchScreen({ onRegister, onSignIn, onPreview }: { onRegister: () => void; onSignIn: () => void; onPreview: () => void }) {
  return (
    <View style={styles.launch}>
      <StatusBar style="light" />
      <Image source={require('./assets/tec-splash-corvette.webp')} style={styles.launchArt} resizeMode="cover" />
      <LinearGradient pointerEvents="none" colors={['#000000', 'rgba(0,0,0,.72)', 'rgba(0,0,0,.06)', 'rgba(0,0,0,.08)', 'rgba(0,0,0,.62)', '#000000']} locations={[0,.15,.37,.55,.79,1]} style={styles.launchShade} />
      <LinearGradient pointerEvents="none" colors={['#000000', 'rgba(0,0,0,.18)', 'rgba(0,0,0,.18)', '#000000']} locations={[0,.25,.75,1]} start={{x:0,y:.5}} end={{x:1,y:.5}} style={styles.launchShade} />
      <View style={styles.launchBrand}>
        <Image source={require('./assets/tec-logo-transparent.png')} style={styles.launchLogo} resizeMode="contain" />
        <Text style={styles.launchTop}>SOUTH FLORIDA'S</Text><Text style={styles.launchFocus}>AUTO ENTHUSIAST</Text><Text style={styles.launchBottom}>SOCIAL NETWORK</Text>
      </View>
      <View style={styles.launchActions}>
        <View style={styles.launchButtonRow}><View style={styles.launchButtonCell}><MetalButton label="REGISTER" onPress={onRegister} /></View><View style={styles.launchButtonCell}><MetalButton label="SIGN IN" onPress={onSignIn} secondary /></View></View>
        {!backendConfigured && <Pressable onPress={onPreview}><Text style={styles.previewLink}>Explore development preview</Text></Pressable>}
      </View>
    </View>
  );
}

function AuthScreen({ mode, setMode, onBack, onDemo }: { mode: AuthMode; setMode: (m: AuthMode) => void; onBack: () => void; onDemo: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim() || password.length < 8) {
      Alert.alert('Check your information', 'Enter your email and a password of at least 8 characters.');
      return;
    }
    if (mode === 'register' && (!name.trim() || !agreed)) {
      Alert.alert('Registration agreement required', 'Enter your name and confirm the regional participation agreement.');
      return;
    }
    if (!supabase) { onDemo(); return; }
    setBusy(true);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { display_name: name.trim(), regional_participant: true } } });
        if (error) throw error;
        Alert.alert('Check your email', 'Open the verification message to finish creating your TEC account.');
      }
    } catch (error) {
      Alert.alert('Unable to continue', error instanceof Error ? error.message : 'Please try again.');
    } finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={styles.authSafe}>
      <StatusBar style="light" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.authContent} keyboardShouldPersistTaps="handled">
          <Pressable onPress={onBack}><Text style={styles.back}>BACK</Text></Pressable>
          <Image source={require('./assets/tec-logo-transparent.png')} style={styles.authLogo} resizeMode="contain" />
          <Text style={styles.authTitle}>{mode === 'signin' ? 'Welcome back.' : 'Join the collective.'}</Text>
          <Text style={styles.authSubtitle}>{mode === 'signin' ? 'Good days ahead.' : 'One shared passion.'}</Text>
          {mode === 'register' && <Field label="DISPLAY NAME" value={name} onChangeText={setName} placeholder="Todd" />}
          <Field label="EMAIL" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
          <Field label="PASSWORD" value={password} onChangeText={setPassword} placeholder="At least 8 characters" secureTextEntry />
          {mode === 'register' && (
            <Pressable style={styles.checkRow} onPress={() => setAgreed(value => !value)}>
              <View style={[styles.checkbox, agreed && styles.checkboxOn]}>{agreed && <Text style={styles.checkmark}>✓</Text>}</View>
              <Text style={styles.checkText}>I am a resident of the Palm Beaches, Martin, St. Lucie and surrounding areas and plan to be a participant in group activities.</Text>
            </Pressable>
          )}
          <MetalButton label={busy ? 'PLEASE WAIT…' : mode === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT'} onPress={submit} disabled={busy} />
          <Pressable onPress={() => setMode(mode === 'signin' ? 'register' : 'signin')}>
            <Text style={styles.switchText}>{mode === 'signin' ? 'New to TEC? Register' : 'Already a member? Sign in'}</Text>
          </Pressable>
          {!backendConfigured && <Text style={styles.devNote}>Development preview: the existing Supabase connection will be added before testing.</Text>}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, ...inputProps } = props;
  return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><TextInput {...inputProps} style={styles.input} placeholderTextColor="#68707a" /></View>;
}

function Header({ firstName, onAccount }: { firstName: string; onAccount: () => void }) {
  return (
    <View style={styles.header}>
      <LinearGradient pointerEvents="none" colors={['#1c1e23', '#08090c', '#120508']} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.headerGradient} />
      <View pointerEvents="none" style={styles.headerShine} />
      <Image source={require('./assets/tec-logo-transparent.png')} style={styles.headerLogo} resizeMode="contain" />
      <View style={styles.headerTools}><Pressable style={styles.bell}><Ionicons name="notifications-outline" size={16} color="#d4b3b3" /></Pressable><Pressable style={styles.avatar} onPress={onAccount}><Text style={styles.avatarText}>{firstName[0]?.toUpperCase()}</Text></Pressable></View>
    </View>
  );
}

function Home({ firstName, plans, onEvent, onTab, onVehicle }: { firstName: string; plans: Record<string, Plan>; onEvent: (e: TecEvent) => void; onTab: (t: Tab) => void; onVehicle: (v: Vehicle) => void }) {
  return (
    <ScrollView contentContainerStyle={[styles.page, styles.pageTransparent]} showsVerticalScrollIndicator={false}>
      <Text style={styles.greeting}>Good to see you, {firstName}.</Text>
      <ScrollView horizontal snapToInterval={342} decelerationRate="fast" showsHorizontalScrollIndicator={false} style={styles.heroRail}>{events.map(event => <EventCard key={event.id} event={event} plan={plans[event.id]} compact onPress={() => onEvent(event)} />)}</ScrollView>
      <Text style={styles.hint}>SWIPE TO EXPLORE UPCOMING EVENTS</Text>
      <Pressable style={styles.shortcut} onPress={() => onTab('garage')}><View style={styles.shortcutIcon}><Text style={styles.shortcutGlyph}>G</Text></View><View><Text style={styles.shortcutTitle}>My garage</Text><Text style={styles.shortcutMeta}>YOUR BUILDS</Text></View></Pressable>
      <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Member Garages</Text><Pressable onPress={() => onTab('garage')}><Text style={styles.explore}>EXPLORE</Text></Pressable></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>{sampleVehicles.map(vehicle => <Pressable key={vehicle.id} style={styles.memberTile} onPress={() => onVehicle(vehicle)}><Image source={vehicle.image} style={styles.memberImage} /><View style={styles.memberShade} /><Text style={styles.memberOwner}>{vehicle.owner}'s garage</Text><Text style={styles.memberCar}>{vehicle.model}</Text></Pressable>)}</ScrollView>
      <Text style={styles.motto}><Text style={styles.mottoWhite}>MEET. </Text><Text style={styles.mottoGray}>CRUISE. </Text><Text style={styles.mottoRed}>CONNECT.</Text></Text>
    </ScrollView>
  );
}

function Events({ plans, onEvent }: { plans: Record<string, Plan>; onEvent: (e: TecEvent) => void }) {
  const [filter, setFilter] = useState<'upcoming' | 'mine'>('upcoming');
  const visible = filter === 'mine' ? events.filter(event => plans[event.id] === 'Going' || plans[event.id] === 'Interested') : events;
  return (
    <ScrollView contentContainerStyle={[styles.page, styles.pageTransparent]} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>Good days ahead.</Text><Text style={styles.pageSubtitle}>Find your next reason to get out.</Text>
      <View style={styles.segment}><Pressable style={[styles.segmentButton, filter === 'upcoming' && styles.segmentOn]} onPress={() => setFilter('upcoming')}><Text style={styles.segmentText}>UPCOMING EVENTS</Text></Pressable><Pressable style={[styles.segmentButton, filter === 'mine' && styles.segmentOn]} onPress={() => setFilter('mine')}><Text style={styles.segmentText}>MY PLANS</Text></Pressable></View>
      {visible.length ? visible.map(event => <View key={event.id}><Text style={styles.dayHeading}>{event.date.toUpperCase()}</Text><EventCard event={event} plan={plans[event.id]} onPress={() => onEvent(event)} /></View>) : <Text style={styles.empty}>Your next plan starts here. Open an event and choose Going or Interested.</Text>}
    </ScrollView>
  );
}

function EventCard({ event, plan, onPress, compact = false }: { event: TecEvent; plan?: Plan; onPress: () => void; compact?: boolean }) {
  if (compact) return (
    <Pressable style={styles.testEventCard} onPress={onPress}>
      <Image source={event.image} style={styles.testEventFlyer} resizeMode="cover" />
      <View style={styles.testDateBadge}><Text style={styles.dateWeek}>{event.weekday}</Text><Text style={styles.dateDay}>{event.day}</Text><Text style={styles.dateMonth}>{event.month}</Text></View>
      <View style={styles.testEventCopy}>
        <Text style={styles.eventType}>{event.category}</Text>
        <Text style={styles.testEventTitle}>{event.title}</Text>
        <Text style={styles.testEventTime}>{event.time}</Text>
        <Text style={styles.testEventVenue}>{event.location}</Text>
        <Text style={styles.testEventAddress}>{event.address}</Text>
        <View style={styles.testEventFooter}>{plan ? <Text style={styles.plan}>{plan}</Text> : <View />}<Text style={styles.testEventAction}>VIEW EVENT</Text></View>
      </View>
    </Pressable>
  );
  return (
    <Pressable style={styles.eventCard} onPress={onPress}>
      <Image source={event.image} style={styles.eventFlyer} resizeMode="cover" />
      <View style={styles.dateBadge}><Text style={styles.dateWeek}>{event.weekday}</Text><Text style={styles.dateDay}>{event.day}</Text><Text style={styles.dateMonth}>{event.month}</Text></View>
      <View style={styles.eventCopy}><Text style={styles.eventType}>{event.category}</Text><Text style={styles.eventTitle}>{event.title}</Text><Text style={styles.eventTime}>{event.time}</Text><Text style={styles.eventVenue}>{event.location}</Text><Text style={styles.eventAddress}>{event.address}</Text><View style={styles.eventFooter}>{plan ? <Text style={styles.plan}>{plan}</Text> : <View />}<Text style={styles.viewEvent}>VIEW EVENT</Text></View></View>
    </Pressable>
  );
}

function Garage({ onVehicle }: { onVehicle: (v: Vehicle) => void }) {
  return (
    <ScrollView contentContainerStyle={[styles.page, styles.pageTransparent]} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>Your garage.</Text><Text style={styles.pageSubtitle}>Every build has a story.</Text>
      {sampleVehicles.slice(0, 2).map(vehicle => <Pressable key={vehicle.id} style={styles.vehicleCard} onPress={() => onVehicle(vehicle)}><Image source={vehicle.image} style={styles.vehicleImage} /><View style={styles.vehicleCopy}><Text style={styles.vehicleYear}>{vehicle.yearMake}</Text><Text style={styles.vehicleModel}>{vehicle.model}</Text><Text style={styles.vehicleDescription}>{vehicle.description}</Text><Text style={styles.viewGarage}>VIEW GARAGE</Text></View></Pressable>)}
      <MetalButton label="ADD VEHICLE" onPress={() => Alert.alert('Add vehicle', 'Photo upload and vehicle details will connect to your TEC garage in the next build.')} />
    </ScrollView>
  );
}

function Photos() {
  const [localPhotos, setLocalPhotos] = useState<string[]>([]);
  const pick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.85 });
    if (!result.canceled) setLocalPhotos(result.assets.map(asset => asset.uri));
  };
  return (
    <ScrollView contentContainerStyle={[styles.page, styles.pageTransparent]} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>Through our lens.</Text><Text style={styles.pageSubtitle}>The cars. The people. The moments.</Text>
      <View style={styles.photoHead}><Text style={styles.hint}>ALL PHOTOS</Text><Pressable onPress={pick}><Text style={styles.explore}>ADD PHOTOS</Text></Pressable></View>
      <View style={styles.gallery}>{localPhotos.map(uri => <Image key={uri} source={{ uri }} style={styles.galleryImage} />)}{gallery.map((image, index) => <Image key={index} source={image} style={styles.galleryImage} />)}</View>
    </ScrollView>
  );
}

function CruiseComingSoon() {
  return (
    <ScrollView contentContainerStyle={[styles.cruisePage, styles.pageTransparent]} showsVerticalScrollIndicator={false}>
      <View style={styles.cruiseIconWrap}><Ionicons name="navigate" size={34} color="#fff" /></View>
      <Text style={styles.cruiseEyebrow}>TEC CRUISE</Text>
      <Text style={styles.cruiseTitle}>Stay with the collective.</Text>
      <Text style={styles.cruiseIntro}>Live cruise mapping is coming soon.</Text>
      <View style={styles.cruisePreview}>
        <View style={styles.routeLine} />
        <View style={[styles.routeDot, { top: 42, left: 40 }]}><Text style={styles.routeInitial}>T</Text></View>
        <View style={[styles.routeDot, { top: 112, right: 54 }]}><Text style={styles.routeInitial}>D</Text></View>
        <View style={[styles.routeDot, { bottom: 34, left: 78 }]}><Text style={styles.routeInitial}>K</Text></View>
        <Ionicons name="location" size={28} color="#c30101" style={styles.routePin} />
      </View>
      <View style={styles.cruiseFeature}><Ionicons name="keypad-outline" size={20} color="#e45c5c" /><View><Text style={styles.cruiseFeatureTitle}>Join with a cruise code</Text><Text style={styles.cruiseFeatureText}>Enter the five-digit code posted with the event.</Text></View></View>
      <View style={styles.cruiseFeature}><Ionicons name="eye-outline" size={20} color="#e45c5c" /><View><Text style={styles.cruiseFeatureTitle}>Follow or Track</Text><Text style={styles.cruiseFeatureText}>View the group or actively share your position.</Text></View></View>
      <View style={styles.cruiseFeature}><Ionicons name="lock-closed-outline" size={20} color="#e45c5c" /><View><Text style={styles.cruiseFeatureTitle}>Private by design</Text><Text style={styles.cruiseFeatureText}>Location sharing will be optional and limited to an active cruise.</Text></View></View>
      <View style={styles.comingSoonBadge}><Text style={styles.comingSoonText}>COMING SOON</Text></View>
      <Text style={styles.cruiseNote}>This preview does not request or share your location.</Text>
    </ScrollView>
  );
}

function EventModal({ event, plan, onPlan, onClose }: { event: TecEvent | null; plan?: Plan; onPlan: (id: string, p: Plan) => void; onClose: () => void }) {
  if (!event) return null;
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalSafe}><StatusBar style="light" /><ScrollView showsVerticalScrollIndicator={false}>
        <Image source={event.image} style={styles.modalHero} resizeMode="cover" />
        <Pressable style={styles.modalClose} onPress={onClose}><Text style={styles.modalCloseText}>CLOSE</Text></Pressable>
        <View style={styles.modalBody}><Text style={styles.eventType}>{event.category}</Text><Text style={styles.modalTitle}>{event.title}</Text><Text style={styles.modalMeta}>{event.date}</Text><Text style={styles.modalMeta}>{event.time} · EASTERN</Text><Text style={styles.modalText}>{event.description}</Text><View style={styles.venueBox}><Text style={styles.venueName}>{event.location}</Text><Text style={styles.eventAddress}>{event.address}</Text></View>
          <Text style={styles.modalHeading}>Your plan</Text><View style={styles.planRow}>{(['Going', 'Interested', "Can't make it"] as Plan[]).map(value => <Pressable key={value} style={[styles.planButton, plan === value && styles.planButtonOn]} onPress={() => onPlan(event.id, value)}><Text style={styles.planButtonText}>{value.toUpperCase()}</Text></Pressable>)}</View>
          <Text style={styles.modalHeading}>The day at a glance</Text>{event.stops.map((stop, index) => <View key={`${stop.time}-${index}`} style={styles.stop}><View style={styles.stopTime}><Text style={styles.stopHour}>{stop.time}</Text><Text style={styles.stopMeridiem}>{stop.meridiem}</Text></View><View style={styles.stopCopy}><Text style={styles.stopTitle}>{stop.title}</Text><Text style={styles.stopDescription}>{stop.description}</Text></View></View>)}
          <MetalButton label="BACK TO THE COLLECTIVE" onPress={onClose} secondary />
        </View>
      </ScrollView></SafeAreaView>
    </Modal>
  );
}

function VehicleModal({ vehicle, onClose }: { vehicle: Vehicle | null; onClose: () => void }) {
  if (!vehicle) return null;
  return <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}><SafeAreaView style={styles.modalSafe}><Image source={vehicle.image} style={styles.modalHero} /><Pressable style={styles.modalClose} onPress={onClose}><Text style={styles.modalCloseText}>CLOSE</Text></Pressable><View style={styles.modalBody}><Text style={styles.vehicleYear}>{vehicle.owner.toUpperCase()} · MEMBER GARAGE</Text><Text style={styles.modalTitle}>{vehicle.model}</Text><Text style={styles.modalText}>{vehicle.description}</Text><Text style={styles.modalHeading}>The build</Text><Text style={styles.modalText}>A space for the details, story, and photos that make every garage its own.</Text><MetalButton label="BACK TO GARAGES" onPress={onClose} secondary /></View></SafeAreaView></Modal>;
}

function TabBar({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  const tabs: { id: Tab; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [{ id: 'home', label: 'HOME', icon: 'home-outline' }, { id: 'events', label: 'EVENTS', icon: 'calendar-outline' }, { id: 'cruise', label: 'CRUISE', icon: 'navigate-outline' }, { id: 'garage', label: 'GARAGE', icon: 'car-sport-outline' }, { id: 'photos', label: 'PHOTOS', icon: 'images-outline' }];
  return <View style={styles.tabbar}>{tabs.map(item => <Pressable key={item.id} style={[styles.tab, tab === item.id && styles.tabOn]} onPress={() => onTab(item.id)}><Ionicons name={item.icon} size={20} color={tab === item.id ? '#fff1f1' : COLORS.muted} /><Text style={[styles.tabLabel, tab === item.id && styles.tabLabelOn]}>{item.label}</Text></Pressable>)}</View>;
}

function MetalButton({ label, onPress, secondary = false, disabled = false }: { label: string; onPress: () => void; secondary?: boolean; disabled?: boolean }) {
  return <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.metalButton, pressed && styles.pressed, disabled && styles.disabled]}><LinearGradient colors={secondary ? ['#3a292b','#111114','#070708','#241012'] : ['#ff5a5a','#dd1726','#99020d','#430005']} locations={[0,.28,.7,1]} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.metalGradient}><View pointerEvents="none" style={styles.metalShine} /><Text style={styles.metalText}>{label}</Text></LinearGradient></Pressable>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, loading: { flex: 1, backgroundColor: COLORS.black, alignItems: 'center', justifyContent: 'center' }, safe: { flex: 1, backgroundColor: COLORS.black }, appBody: { flex: 1, backgroundColor: '#050608' },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden' }, backdropBase: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }, backdropSweep: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }, backdropRedGlow: { position: 'absolute', width: 480, height: 480, borderRadius: 240, top: -170, right: -270, backgroundColor: 'rgba(135,0,15,.17)', shadowColor: '#d30018', shadowOpacity: .55, shadowRadius: 95, elevation: 2 }, backdropSilverGlow: { position: 'absolute', width: 420, height: 420, borderRadius: 210, top: 250, left: -310, backgroundColor: 'rgba(133,142,155,.08)', shadowColor: '#cbd0d8', shadowOpacity: .18, shadowRadius: 85 }, backdropHairline: { position: 'absolute', top: 2, left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,.09)' },
  pageTransparent: { backgroundColor: 'transparent' },
  launch: { flex: 1, justifyContent: 'space-between', backgroundColor: '#000', paddingHorizontal: 24, paddingTop: Platform.OS === 'android' ? 24 : 38, paddingBottom: Platform.OS === 'android' ? 52 : 36 }, launchArt: { position: 'absolute', top: '6%', bottom: '4%', left: -46, right: -46, width: undefined, height: '90%' }, launchShade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }, launchBrand: { alignItems: 'center', zIndex: 2 }, launchLogo: { width: '100%', height: 82 }, launchTop: { color: '#d6d7da', fontFamily: 'TecBody', fontSize: 13, letterSpacing: 1.2, lineHeight: 21, marginTop: 2 }, launchFocus: { color: '#fff', fontFamily: 'TecBody', fontSize: 15, letterSpacing: 1.2, lineHeight: 22, textShadowColor: '#000', textShadowRadius: 8 }, launchBottom: { color: '#d6d7da', fontFamily: 'TecBody', fontSize: 13, letterSpacing: 1.2, lineHeight: 21 }, launchActions: { zIndex: 2, alignItems: 'center', gap: 18, paddingTop: 20 }, launchButtonRow: { flexDirection: 'row', gap: 12, width: '100%', maxWidth: 420 }, launchButtonCell: { flex: 1 }, previewLink: { color: '#a4a5aa', fontFamily: 'TecBody', textAlign: 'center', textDecorationLine: 'underline', textDecorationColor: '#6b3434', fontSize: 11, letterSpacing: .4 },
  metalButton: { minHeight: 56, borderRadius: 9, overflow: 'hidden', borderWidth: 1, borderColor: '#d15a61', shadowColor: '#000', shadowOpacity: .88, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 10 }, metalGradient: { flex: 1, minHeight: 54, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,.08)', borderRadius: 8 }, metalShine: { position: 'absolute', top: 1, left: 8, right: 8, height: 1, backgroundColor: 'rgba(255,255,255,.55)' }, metalText: { color: COLORS.white, fontFamily: 'TecBodyBold', letterSpacing: 1.2, fontSize: 13, textShadowColor: '#000', textShadowOffset: {width:0,height:2}, textShadowRadius: 5 }, pressed: { opacity: .8, transform: [{translateY: 1}] }, disabled: { opacity: .5 },
  authSafe: { flex: 1, backgroundColor: COLORS.black }, authContent: { flexGrow: 1, padding: 24, paddingTop: 16, justifyContent: 'center' }, back: { color: COLORS.silver, letterSpacing: 2, marginBottom: 20 }, authLogo: { width: '100%', height: 92 }, authTitle: { color: COLORS.white, fontSize: 34, fontWeight: '900', marginTop: 22 }, authSubtitle: { color: COLORS.muted, fontSize: 16, marginTop: 5, marginBottom: 30 }, field: { marginBottom: 18 }, fieldLabel: { color: COLORS.silver, fontSize: 11, fontWeight: '800', letterSpacing: 1.6, marginBottom: 8 }, input: { color: COLORS.white, backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.line, borderRadius: 4, minHeight: 54, paddingHorizontal: 15, fontSize: 16 }, checkRow: { flexDirection: 'row', gap: 12, marginBottom: 24 }, checkbox: { width: 25, height: 25, borderWidth: 1, borderColor: COLORS.silver, alignItems: 'center', justifyContent: 'center' }, checkboxOn: { backgroundColor: COLORS.red, borderColor: COLORS.red }, checkmark: { color: COLORS.white, fontWeight: '900' }, checkText: { color: COLORS.silver, flex: 1, lineHeight: 20, fontSize: 13 }, switchText: { color: COLORS.white, textAlign: 'center', marginTop: 22, textDecorationLine: 'underline' }, devNote: { color: COLORS.muted, fontSize: 11, textAlign: 'center', marginTop: 25, lineHeight: 16 },
  header: { minHeight: 108, borderBottomWidth: 2, borderBottomColor: '#8d1520', justifyContent: 'flex-end', paddingHorizontal: 8, paddingTop: 34, paddingBottom: 9, backgroundColor: '#090b0e', shadowColor: '#000', shadowOpacity: .9, shadowRadius: 14, shadowOffset: {width:0,height:8}, elevation: 12, overflow: 'hidden' }, headerGradient: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }, headerShine: { position: 'absolute', left: 14, right: 14, bottom: 1, height: 1, backgroundColor: 'rgba(255,105,115,.5)' }, headerLogo: { width: '100%', height: 60, zIndex: 2 }, headerTools: { position: 'absolute', top: Platform.OS === 'android' ? 3 : 8, right: 4, flexDirection: 'row', alignItems: 'center', padding: 3, borderWidth: 1, borderColor: '#9c484c90', borderRadius: 9, backgroundColor: '#171116', zIndex: 3, shadowColor: '#000', shadowOpacity: .8, shadowRadius: 7, elevation: 6 }, bell: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }, avatar: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }, avatarText: { width: 25, height: 25, borderRadius: 13, overflow: 'hidden', backgroundColor: '#8f0101', color: COLORS.white, fontFamily: 'TecBodyBold', textAlign: 'center', textAlignVertical: 'center', fontSize: 11 },
  page: { padding: 22, paddingBottom: 36, backgroundColor: '#090b0e' }, greeting: { color: COLORS.white, fontFamily: 'TecBodyBold', fontSize: 18, marginBottom: 20, marginTop: 8 }, heroRail: { marginHorizontal: -22, paddingLeft: 22 }, hint: { color: '#8390a3', fontFamily: 'TecBody', fontSize: 11, letterSpacing: .5, marginVertical: 10 }, shortcut: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#17171c', borderWidth: 1, borderColor: '#66303080', padding: 14, borderRadius: 10, marginVertical: 8 }, shortcutIcon: { width: 38, height: 38, backgroundColor: '#560909', borderRadius: 6, alignItems: 'center', justifyContent: 'center' }, shortcutGlyph: { color: COLORS.white, fontFamily: 'TecBodyBold' }, shortcutTitle: { color: COLORS.white, fontFamily: 'TecBodyBold', fontSize: 16 }, shortcutMeta: { color: COLORS.muted, fontFamily: 'TecBody', fontSize: 9, letterSpacing: 1.2 }, sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 22, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#6c2c2c5e', paddingBottom: 12 }, sectionTitle: { color: COLORS.white, fontFamily: 'TecBodyBold', fontSize: 16, borderLeftWidth: 3, borderLeftColor: '#c30101', paddingLeft: 11 }, explore: { color: '#e24d4d', fontFamily: 'TecBodyBold', fontSize: 11, letterSpacing: 1 }, memberTile: { width: 245, height: 205, borderRadius: 10, overflow: 'hidden', marginRight: 12, justifyContent: 'flex-end', padding: 14, borderWidth: 1, borderColor: '#6b323280' }, memberImage: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, width: undefined, height: undefined }, memberShade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,.38)' }, memberOwner: { color: COLORS.white, fontFamily: 'TecBodyBold', fontSize: 16 }, memberCar: { color: '#b39494', fontFamily: 'TecBody', fontSize: 11 }, motto: { textAlign: 'center', marginTop: 30, paddingTop: 21, borderTopWidth: 1, borderTopColor: '#6c2c2c5e', fontFamily: 'TecBodyBold', fontSize: 13 }, mottoWhite: { color: COLORS.white }, mottoGray: { color: COLORS.silver }, mottoRed: { color: '#c30101' },
  pageTitle: { color: COLORS.white, fontSize: 31, fontWeight: '900', marginTop: 12 }, pageSubtitle: { color: COLORS.muted, fontSize: 15, marginTop: 4, marginBottom: 20 }, segment: { flexDirection: 'row', backgroundColor: COLORS.panel, padding: 3, borderRadius: 5, marginBottom: 20 }, segmentButton: { flex: 1, paddingVertical: 12, alignItems: 'center' }, segmentOn: { backgroundColor: COLORS.redDark }, segmentText: { color: COLORS.white, fontSize: 10, fontWeight: '800', letterSpacing: 1 }, dayHeading: { color: COLORS.silver, fontSize: 11, fontWeight: '900', letterSpacing: 1.2, marginBottom: 8, marginTop: 10 }, empty: { color: COLORS.muted, textAlign: 'center', lineHeight: 23, padding: 35 },
  compactTicket: { width: 330, minHeight: 220, marginRight: 12, flexDirection: 'row', borderWidth: 1, borderColor: '#633030', borderRadius: 15, overflow: 'hidden', backgroundColor: '#11151a' }, compactStub: { width: 76, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 7, borderRightWidth: 1, borderRightColor: '#75404080', borderStyle: 'dashed', backgroundColor: '#121116' }, compactFlyer: { width: 62, height: 95, borderRadius: 5, backgroundColor: '#060709' }, compactDate: { alignItems: 'center', gap: 5, marginTop: 12 }, compactDateText: { color: '#c8cdd6', fontFamily: 'TecBodyBold', fontSize: 11 }, compactDay: { color: '#fff', fontFamily: 'TecBody', fontSize: 20 }, compactYear: { color: '#8b94a2', fontFamily: 'TecBody', fontSize: 10 }, compactBody: { flex: 1, paddingVertical: 13, paddingHorizontal: 11 }, compactTitle: { color: '#fff', fontFamily: 'TecBodyBold', fontSize: 13, lineHeight: 19 }, compactTime: { color: '#f0f2f5', fontFamily: 'TecBodyBold', fontSize: 12, lineHeight: 18, marginTop: 8 }, compactVenue: { color: '#c2c8d3', fontFamily: 'TecBodyBold', fontSize: 12, lineHeight: 18, marginTop: 8 }, compactAddress: { color: '#929dac', fontFamily: 'TecBody', fontSize: 12, lineHeight: 18, marginTop: 4 }, compactFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 'auto', paddingTop: 10 }, compactAction: { color: '#fff', backgroundColor: '#720814', overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 6, fontFamily: 'TecBodyBold', fontSize: 10 },
  eventCard: { backgroundColor: COLORS.panel, borderWidth: 1, borderColor: '#633030', borderRadius: 15, overflow: 'hidden', marginBottom: 20, width: '100%' }, eventFlyer: { width: '100%', height: 190, backgroundColor: COLORS.panel2 }, dateBadge: { position: 'absolute', top: 10, left: 10, width: 52, backgroundColor: 'rgba(5,6,8,.92)', borderTopWidth: 3, borderTopColor: COLORS.red, paddingVertical: 5, alignItems: 'center' }, dateWeek: { color: COLORS.silver, fontFamily: 'TecBodyBold', fontSize: 9 }, dateDay: { color: COLORS.white, fontFamily: 'TecBody', fontSize: 24, lineHeight: 27 }, dateMonth: { color: COLORS.red, fontFamily: 'TecBodyBold', fontSize: 10 }, eventCopy: { padding: 15 }, eventType: { color: COLORS.red, fontFamily: 'TecBodyBold', fontSize: 10, letterSpacing: 1.2 }, eventTitle: { color: COLORS.white, fontFamily: 'TecBodyBold', fontSize: 14, lineHeight: 21, marginTop: 5 }, eventTime: { color: COLORS.silver, fontFamily: 'TecBodyBold', fontSize: 14, marginTop: 8 }, eventVenue: { color: COLORS.white, fontFamily: 'TecBodyBold', fontSize: 14, marginTop: 10 }, eventAddress: { color: COLORS.muted, fontFamily: 'TecBody', fontSize: 13, lineHeight: 20, marginTop: 3 }, eventFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15 }, plan: { color: COLORS.silver, fontFamily: 'TecBodyBold', fontSize: 11 }, viewEvent: { color: COLORS.white, backgroundColor: COLORS.redDark, overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 8, fontFamily: 'TecBodyBold', fontSize: 10, letterSpacing: 1 },
  vehicleCard: { backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.line, borderRadius: 5, overflow: 'hidden', marginBottom: 18 }, vehicleImage: { width: '100%', height: 215 }, vehicleCopy: { padding: 16 }, vehicleYear: { color: COLORS.red, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 }, vehicleModel: { color: COLORS.white, fontSize: 25, fontWeight: '900', marginTop: 5 }, vehicleDescription: { color: COLORS.silver, marginTop: 8, lineHeight: 20 }, viewGarage: { color: COLORS.white, textAlign: 'right', fontSize: 10, letterSpacing: 1.3, fontWeight: '900', marginTop: 15 }, photoHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, gallery: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 }, galleryImage: { width: '49%', aspectRatio: 1, borderRadius: 3 },
  cruisePage: { flexGrow: 1, padding: 22, paddingBottom: 40, backgroundColor: '#090b0e', alignItems: 'center' }, cruiseIconWrap: { width: 70, height: 70, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginTop: 14, backgroundColor: '#4e0000', borderWidth: 1, borderColor: '#bf4b4b', shadowColor: '#c30101', shadowOpacity: .28, shadowRadius: 14, elevation: 5 }, cruiseEyebrow: { color: '#e45c5c', fontFamily: 'TecBodyBold', fontSize: 11, letterSpacing: 1.6, marginTop: 18 }, cruiseTitle: { color: '#fff', fontFamily: 'TecBodyBold', fontSize: 24, textAlign: 'center', marginTop: 7 }, cruiseIntro: { color: '#9da6b2', fontFamily: 'TecBody', fontSize: 15, textAlign: 'center', marginTop: 6 }, cruisePreview: { width: '100%', height: 210, borderRadius: 15, overflow: 'hidden', marginTop: 24, backgroundColor: '#11151a', borderWidth: 1, borderColor: '#633030' }, routeLine: { position: 'absolute', width: 260, height: 5, top: 104, left: 28, borderRadius: 3, backgroundColor: '#5f2020', transform: [{ rotate: '23deg' }] }, routeDot: { position: 'absolute', width: 34, height: 34, borderRadius: 17, backgroundColor: '#750707', borderWidth: 2, borderColor: '#e76565', alignItems: 'center', justifyContent: 'center' }, routeInitial: { color: '#fff', fontFamily: 'TecBodyBold', fontSize: 12 }, routePin: { position: 'absolute', top: 80, left: '47%' }, cruiseFeature: { width: '100%', flexDirection: 'row', gap: 13, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#3d292d', alignItems: 'flex-start' }, cruiseFeatureTitle: { color: '#fff', fontFamily: 'TecBodyBold', fontSize: 14 }, cruiseFeatureText: { color: '#929dac', fontFamily: 'TecBody', fontSize: 12, lineHeight: 18, marginTop: 3, paddingRight: 24 }, comingSoonBadge: { marginTop: 26, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 8, backgroundColor: '#4e0000', borderWidth: 1, borderColor: '#a94444' }, comingSoonText: { color: '#fff', fontFamily: 'TecBodyBold', fontSize: 12, letterSpacing: 1.8 }, cruiseNote: { color: '#737d89', fontFamily: 'TecBody', fontSize: 11, textAlign: 'center', marginTop: 14 },
  tabbar: { minHeight: 78, borderTopWidth: 1, borderTopColor: '#a84545', backgroundColor: '#121116', flexDirection: 'row', paddingHorizontal: 7, paddingTop: 7, paddingBottom: Platform.OS === 'ios' ? 12 : 8 }, tab: { flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent', borderRadius: 10 }, tabOn: { backgroundColor: '#4b1111', borderColor: '#a64c4c8c' }, tabLabel: { color: COLORS.muted, fontFamily: 'TecBodyBold', fontSize: 9, letterSpacing: .7, marginTop: 5 }, tabLabelOn: { color: '#fff1f1' },
  testEventCard: { width: 328, height: 430, marginRight: 14, borderWidth: 1, borderColor: '#8a4349', borderRadius: 14, overflow: 'hidden', backgroundColor: '#0d1014', shadowColor: '#000', shadowOpacity: .9, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 10 }, testEventFlyer: { width: '100%', height: 184, backgroundColor: '#15191e' }, testDateBadge: { position: 'absolute', top: 10, left: 10, width: 52, backgroundColor: 'rgba(5,6,8,.94)', borderTopWidth: 3, borderTopColor: '#d0202f', paddingVertical: 5, alignItems: 'center' }, testEventCopy: { flex: 1, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 13 }, testEventTitle: { color: '#fff', fontFamily: 'TecBodyBold', fontSize: 17, lineHeight: 22, marginTop: 5 }, testEventTime: { color: '#c8ccd1', fontFamily: 'TecBodyBold', fontSize: 13, marginTop: 9 }, testEventVenue: { color: '#fff', fontFamily: 'TecBodyBold', fontSize: 13, lineHeight: 18, marginTop: 9 }, testEventAddress: { color: '#9ba2aa', fontFamily: 'TecBody', fontSize: 12, lineHeight: 17, marginTop: 3 }, testEventFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }, testEventAction: { color: '#fff', backgroundColor: '#720814', overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 5, fontFamily: 'TecBodyBold', fontSize: 10, letterSpacing: 1 },
  modalSafe: { flex: 1, backgroundColor: COLORS.black }, modalHero: { width: '100%', height: 300, backgroundColor: COLORS.panel }, modalClose: { position: 'absolute', top: Platform.OS === 'ios' ? 18 : 34, right: 16, backgroundColor: 'rgba(5,6,8,.88)', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 4 }, modalCloseText: { color: COLORS.white, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 }, modalBody: { padding: 20, paddingBottom: 45 }, modalTitle: { color: COLORS.white, fontSize: 30, fontWeight: '900', marginTop: 6 }, modalMeta: { color: COLORS.silver, marginTop: 6, fontWeight: '700' }, modalText: { color: COLORS.silver, lineHeight: 22, marginTop: 18 }, venueBox: { backgroundColor: COLORS.panel, borderLeftWidth: 3, borderLeftColor: COLORS.red, padding: 14, marginTop: 18 }, venueName: { color: COLORS.white, fontWeight: '900' }, modalHeading: { color: COLORS.white, fontSize: 19, fontWeight: '900', marginTop: 26, marginBottom: 12 }, planRow: { flexDirection: 'row', gap: 6 }, planButton: { flex: 1, minHeight: 48, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }, planButtonOn: { backgroundColor: COLORS.redDark, borderColor: COLORS.red }, planButtonText: { color: COLORS.white, fontSize: 9, fontWeight: '900', textAlign: 'center' }, stop: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.line, paddingVertical: 16 }, stopTime: { width: 66 }, stopHour: { color: COLORS.white, fontWeight: '900', fontSize: 18 }, stopMeridiem: { color: COLORS.red, fontWeight: '900', fontSize: 9 }, stopCopy: { flex: 1 }, stopTitle: { color: COLORS.white, fontWeight: '900' }, stopDescription: { color: COLORS.muted, lineHeight: 19, marginTop: 4 }
});
