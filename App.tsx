import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  useWindowDimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text as RNText,
  TextInput,
  View
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useFonts } from 'expo-font';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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

function Text(props: React.ComponentProps<typeof RNText>) {
  return <RNText {...props} style={[styles.globalText, props.style]} />;
}

export default function App() {
  return <SafeAreaProvider><AppContent /></SafeAreaProvider>;
}

function AppContent() {
  const [fontsLoaded] = useFonts({
    TecBody: require('./assets/nimbus-sans.otf'),
    TecBodyBold: require('./assets/nimbus-sans-bold.otf'),
    TecDisplay: require('./assets/michroma-regular.ttf')
  });
  const [sessionState, setSessionState] = useState<SessionState>('loading');
  const [showSplash, setShowSplash] = useState(true);
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [tab, setTab] = useState<Tab>('home');
  const [perksOpen, setPerksOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<TecEvent | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [plans, setPlans] = useState<Record<string, Plan>>({});
  const [garageOwner, setGarageOwner] = useState('preview');
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
      if (active) setGarageOwner(data.session?.user.id ?? 'preview');
      if (active) setSessionState(data.session ? 'signedIn' : 'signedOut');
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setGarageOwner(session?.user.id ?? 'preview');
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
      {tab !== 'home' && <Header firstName={firstName} onAccount={() => Alert.alert('Account', 'Account settings, privacy, and account deletion will live here.')} />}
      <View style={styles.appBody}>
        <AppBackdrop />
        {tab === 'home' && <Home onPerks={() => setPerksOpen(true)} firstName={firstName} plans={plans} onEvent={setSelectedEvent} onTab={setTab} onVehicle={setSelectedVehicle} />}
        {tab === 'events' && <Events plans={plans} onEvent={setSelectedEvent} />}
        {tab === 'cruise' && <CruiseComingSoon />}
        {tab === 'garage' && <Garage key={garageOwner} owner={garageOwner} onVehicle={setSelectedVehicle} />}
        {tab === 'photos' && <Photos />}
      </View>
      <TabBar tab={tab} onTab={setTab} />
      <Modal visible={perksOpen} onRequestClose={() => setPerksOpen(false)} animationType="slide">
        <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.page}>
          <Text style={styles.pageTitle}>Member Perks</Text>
          {[['Outlaw Racing','10% off labor for TEC members'],['P1 Underground','Tuning'],['Aligned Performance','Alignments and tires']].map(([name,offer]) =>
            <View key={name} style={styles.venueBox}><Text style={styles.venueName}>{name}</Text><Text style={styles.modalText}>{offer}</Text></View>)}
          <MetalButton label="BACK TO HOME" onPress={() => setPerksOpen(false)} secondary />
        </ScrollView></SafeAreaView>
      </Modal>
      <EventModal event={selectedEvent} plan={selectedEvent ? plans[selectedEvent.id] : undefined} onPlan={savePlan} onClose={() => setSelectedEvent(null)} />
      <VehicleModal vehicle={selectedVehicle} onClose={() => setSelectedVehicle(null)} />
    </SafeAreaView>
  );
}

function AppBackdrop() {
  return (
    <View pointerEvents="none" style={styles.backdrop}>
      <View style={styles.carbonZone}>
        <View style={[styles.carbonWeave, styles.carbonWeaveA]}>{Array.from({ length: 40 }, (_, i) => <View key={`a-${i}`} style={styles.carbonFiber} />)}</View>
        <View style={[styles.carbonWeave, styles.carbonWeaveB]}>{Array.from({ length: 40 }, (_, i) => <View key={`b-${i}`} style={styles.carbonFiber} />)}</View>
        <LinearGradient colors={['rgba(5,6,8,.04)', 'rgba(5,6,8,.28)', '#050608']} locations={[0, .52, 1]} style={styles.carbonFade} />
      </View>
    </View>
  );
}

function LaunchScreen({ onRegister, onSignIn, onPreview }: { onRegister: () => void; onSignIn: () => void; onPreview: () => void }) {
  const { width, height } = useWindowDimensions();
  // Show only the approved Corvette scene between the live header and controls.
  const scale = Math.min(width / 941, height * .48 / 725);
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={finish.welcome} bounces={false}>
        <Image source={require('./assets/tec-logo-transparent.png')} resizeMode="contain" style={finish.brand} />
        <Text style={finish.kicker}>SOUTH FLORIDA’S</Text>
        <Text style={finish.heroText}>AUTO ENTHUSIAST</Text>
        <Text style={finish.kicker}>SOCIAL NETWORK</Text>
        <View accessible accessibilityLabel="Orange Corvette at a sunset car meet" style={{ width: 941 * scale, height: 725 * scale, overflow: 'hidden' }}>
          <Image accessible={false} source={require('./assets/tec-welcome.png')}
            style={{ position: 'absolute', width: 941 * scale, height: 1672 * scale, top: -600 * scale }} />
          <LinearGradient pointerEvents="none" colors={['#050608', 'transparent', 'transparent', '#050608']}
            locations={[0, .1, .88, 1]} style={StyleSheet.absoluteFill} />
        </View>
        <View style={finish.actions}>
          <View style={styles.launchButtonRow}>
            <View style={styles.launchButtonCell}><MetalButton label="REGISTER" onPress={onRegister} /></View>
            <View style={styles.launchButtonCell}><MetalButton label="SIGN IN" onPress={onSignIn} secondary /></View>
          </View>
          {!backendConfigured && <Pressable onPress={onPreview}><Text style={styles.previewLink}>Explore development preview</Text></Pressable>}
        </View>
      </ScrollView>
    </SafeAreaView>
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
  return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><TextInput {...inputProps} style={[styles.input, styles.globalText, inputProps.multiline && { minHeight:90, textAlignVertical:'top', paddingVertical:12 }]} placeholderTextColor="#68707a" /></View>;
}

function Header({ firstName, onAccount }: { firstName: string; onAccount: () => void }) {
  return (
    <View style={styles.header}>
      <LinearGradient pointerEvents="none" colors={['#17181a', '#0a0a0b', '#060607']} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.headerGradient} />
      <Image source={require('./assets/tec-logo-transparent.png')} style={styles.headerLogo} resizeMode="contain" />
      <View style={styles.headerTools}><Pressable style={styles.bell}><Ionicons name="notifications-outline" size={16} color="#d4b3b3" /></Pressable><Pressable style={styles.avatar} onPress={onAccount}><Text style={styles.avatarText}>{firstName[0]?.toUpperCase()}</Text></Pressable></View>
    </View>
  );
}

function Home({ firstName, plans, onEvent, onTab, onVehicle, onPerks }: { onPerks: () => void; firstName: string; plans: Record<string, Plan>; onEvent: (e: TecEvent) => void; onTab: (t: Tab) => void; onVehicle: (v: Vehicle) => void }) {
  const [membersOpen, setMembersOpen] = useState(false);
  return (
    <ScrollView contentContainerStyle={[styles.page, styles.pageTransparent]} showsVerticalScrollIndicator={false}>
      <View style={styles.scrollHeader}><Header firstName={firstName} onAccount={() => Alert.alert('Account', 'Account settings, privacy, and account deletion will live here.')} /></View>
      <Text style={styles.greeting}>Good to see you, {firstName}.</Text>
      <ScrollView horizontal decelerationRate="fast" showsHorizontalScrollIndicator={false} style={styles.heroRail}>{events.map(event => <EventCard key={event.id} event={event} plan={plans[event.id]} compact onPress={() => onEvent(event)} />)}</ScrollView>
      <Text style={styles.hint}>SWIPE TO EXPLORE UPCOMING EVENTS</Text>
      <Pressable style={styles.shortcut} onPress={() => onTab('garage')}><MaterialCommunityIcons name="garage" size={28} color="#d5d8dc" /><Text style={styles.shortcutTitle}>My Garage</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityState={{expanded:membersOpen}} style={styles.shortcut} onPress={() => setMembersOpen(open => !open)}>
        <Ionicons name="people-outline" size={26} color={COLORS.silver} /><Text style={styles.shortcutTitle}>Member Garages</Text>
      </Pressable>
      {membersOpen && sampleVehicles.map(vehicle => <Pressable key={vehicle.id} onPress={() => onVehicle(vehicle)} style={styles.shortcut}>
        <Image source={vehicle.image} style={{width:72,height:50}} resizeMode="contain" />
        <View><Text style={styles.memberOwner}>{vehicle.owner}</Text><Text style={styles.memberCar}>{vehicle.model}</Text></View>
      </Pressable>)}
      <Pressable accessibilityRole="button" style={styles.shortcut} onPress={onPerks}>
        <Ionicons name="pricetag-outline" size={25} color={COLORS.silver} /><Text style={styles.shortcutTitle}>Member Perks</Text>
      </Pressable>
      <Text style={styles.motto}><RNText style={styles.mottoWhite}>MEET. </RNText><RNText style={styles.mottoGray}>CRUISE. </RNText><RNText style={styles.mottoRed}>CONNECT.</RNText></Text>
    </ScrollView>
  );
}

function Events({ plans, onEvent }: { plans: Record<string, Plan>; onEvent: (e: TecEvent) => void }) {
  const [filter, setFilter] = useState<'upcoming' | 'mine'>('upcoming');
  const visible = filter === 'mine' ? events.filter(event => plans[event.id] === 'Going' || plans[event.id] === 'Interested') : events;
  return (
    <ScrollView contentContainerStyle={[styles.page, styles.pageTransparent]} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>Good days ahead.</Text><Text style={styles.pageSubtitle}>Find your next reason to get out.</Text>
      <View style={styles.segment}><Pressable style={[styles.segmentButton, filter === 'upcoming' && styles.segmentOn]} onPress={() => setFilter('upcoming')}><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={styles.segmentText}>UPCOMING EVENTS</Text></Pressable><Pressable style={[styles.segmentButton, filter === 'mine' && styles.segmentOn]} onPress={() => setFilter('mine')}><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={styles.segmentText}>MY PLANS</Text></Pressable></View>
      {visible.length ? visible.map(event => <View key={event.id} style={styles.eventListTicket}><EventCard event={event} plan={plans[event.id]} compact onPress={() => onEvent(event)} /></View>) : <Text style={styles.empty}>Your next plan starts here. Open an event and choose Going or Interested.</Text>}
    </ScrollView>
  );
}

function EventCard({ event, plan, onPress, compact = false }: { event: TecEvent; plan?: Plan; onPress: () => void; compact?: boolean }) {
  const { width } = useWindowDimensions();
  if (compact) return (
    <Pressable accessibilityRole="button" accessibilityLabel={'View ' + event.title} onPress={onPress}
      style={[finish.ticket, { width: Math.min(width - 44, 310) }]}>
      <View style={finish.date}>
        <Text style={styles.compactDateText}>{event.weekday}</Text>
        <Text style={styles.dateMonth}>{event.month}</Text>
        <Text style={styles.compactDay}>{event.day}</Text>
      </View>
      <Image source={event.image} style={finish.flyerThumb} resizeMode="contain" />
      <View style={finish.ticketBody}>
        <Text style={styles.compactTitle}>{event.title}</Text>
        <Text style={styles.compactTime}>{event.time}</Text>
        <Text style={styles.compactVenue}>{event.location}</Text>
        <Text style={styles.compactAddress}>{event.address}</Text>
        {plan && <Text style={styles.plan}>{plan}</Text>}
        <LinearGradient colors={['#bd2932','#810611','#420309']} style={finish.ticketButton}><Text style={styles.eventActionText}>VIEW EVENT</Text></LinearGradient>
      </View>
    </Pressable>
  );
  return (
    <Pressable style={styles.eventCard} onPress={onPress}>
      <Image source={event.image} style={styles.eventFlyer} resizeMode="contain" />
      <View style={styles.dateBadge}><Text style={styles.dateWeek}>{event.weekday}</Text><Text style={styles.dateDay}>{event.day}</Text><Text style={styles.dateMonth}>{event.month}</Text></View>
      <LinearGradient colors={['#181b20', '#0c0f13']} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={styles.eventCopy}><LinearGradient colors={['#ff737b', '#c81724', '#530008']} start={{x: 0, y: .5}} end={{x: 1, y: .5}} style={styles.eventMetalRule} /><Text style={styles.eventType}>{event.category}</Text><Text style={styles.eventTitle}>{event.title}</Text><Text style={styles.eventTime}>{event.time}</Text><Text style={styles.eventVenue}>{event.location}</Text><Text style={styles.eventAddress}>{event.address}</Text><View style={styles.eventFooter}>{plan ? <Text style={styles.plan}>{plan}</Text> : <View />}<LinearGradient colors={['#ff5a64','#c81724','#650009']} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.viewEvent}><Text style={styles.eventActionText}>VIEW EVENT</Text></LinearGradient></View></LinearGradient>
    </Pressable>
  );
}

const garageFields = [
  ['year','Year'], ['make','Make'], ['model','Model'], ['trim','Trim'], ['color','Color'],
  ['mods','Modifications'], ['special','What Makes It Special'], ['description','Description']
] as const;
const blankCar = {year:'',make:'',model:'',trim:'',color:'',mods:'',special:'',description:''};
type GarageEntry = typeof blankCar & { photos: string[] };

async function choosePhotos() {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes:['images'], allowsMultipleSelection:true, quality:.9
  });
  return result.assets ?? [];
}

function Garage({ owner, onVehicle }: { owner: string; onVehicle: (v: Vehicle) => void }) {
  const key = 'tec-garage-v1-' + owner;
  const [saved, setSaved] = useState<GarageEntry | null>(null);
  const [draft, setDraft] = useState<GarageEntry>({...blankCar, photos:[]});
  const [editing, setEditing] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(key).then(raw => {
      if (active) { setSaved(raw ? JSON.parse(raw) : null); setReady(true); }
    }).catch(() => Alert.alert('Garage unavailable','Please reopen your garage and try again.'));
    return () => { active = false; };
  }, [key]);
  const pick = async () => {
    try {
      const picked = await choosePhotos();
      setDraft(d => ({...d,photos:[...new Set([...d.photos,...picked.map(p => p.uri)])]}));
    } catch { Alert.alert('Photos unavailable','Please try choosing the photos again.'); }
  };
  const save = async () => {
    if (!draft.make.trim() || !draft.model.trim()) { Alert.alert('Vehicle details','Please enter a make and model.'); return; }
    setBusy(true);
    try {
      const folder = new Directory(Paths.document,'garage-' + owner);
      folder.create({intermediates:true,idempotent:true});
      const photos = draft.photos.map((uri,i) => {
        if (uri.startsWith(folder.uri + '/') || saved?.photos.includes(uri)) return uri;
        const src = new File(uri);
        const target = new File(folder, Date.now() + '-' + i + (src.extension || '.jpg'));
        src.copy(target);
        return target.uri;
      });
      const entry = {...draft,photos};
      await AsyncStorage.setItem(key, JSON.stringify(entry));
      setSaved(entry); setEditing(false);
    } catch { Alert.alert('Could not save','Your entries are still here. Please try again.'); }
    finally { setBusy(false); }
  };
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page}>
    <Text style={styles.pageTitle}>{editing ? 'Set Up Your Garage' : 'Your Garage'}</Text>
    {editing ? <View style={finish.form}>
      <Pressable accessibilityRole="button" style={styles.shortcut} onPress={pick}><MaterialCommunityIcons name="garage" color={COLORS.silver} size={28}/><Text style={styles.shortcutTitle}>Add Photos</Text></Pressable>
      {draft.photos.map(uri => <Image key={uri} source={{uri}} resizeMode="contain" style={styles.vehicleImage} />)}
      {garageFields.map(([id,label],i) => <Field key={id} label={label} value={draft[id]} multiline={i>=5} numberOfLines={i>=5?3:1}
        keyboardType={id==='year'?'number-pad':'default'} onChangeText={value => setDraft(d => ({...d,[id]:value}))} />)}
      <MetalButton label="SAVE MY GARAGE" onPress={save} disabled={busy} />
      <MetalButton label="CANCEL" secondary disabled={busy} onPress={() => setEditing(false)} />
    </View> : <>
      {saved && <View style={styles.vehicleCopy}>
        {saved.photos.map(uri => <Image key={uri} source={{uri}} resizeMode="contain" style={styles.vehicleImage} />)}
        {garageFields.filter(([id])=>saved[id]).map(([id,label])=><View key={id} style={finish.spec}><Text style={styles.fieldLabel}>{label}</Text><Text style={styles.venueName}>{saved[id]}</Text></View>)}
      </View>}
      <MetalButton label={saved?'EDIT MY GARAGE':'SET UP MY GARAGE'} disabled={!ready} onPress={() => {setDraft(saved ?? {...blankCar,photos:[]}); setEditing(true);}} />
      <Text style={styles.modalHeading}>Member Garages</Text>
      {sampleVehicles.map(vehicle => <Pressable key={vehicle.id} style={styles.vehicleCard} onPress={() => onVehicle(vehicle)}>
        <Image source={vehicle.image} resizeMode="contain" style={styles.vehicleImage} />
        <View style={styles.vehicleCopy}><Text style={styles.venueName}>{vehicle.owner} · {vehicle.model}</Text></View>
      </Pressable>)}
    </>}
  </ScrollView>;
}

function Photos() {
  const [localPhotos, setLocalPhotos] = useState<string[]>([]);
  const pick = async () => {
    try { const picked = await choosePhotos(); setLocalPhotos(current => [...new Set([...current, ...picked.map(p=>p.uri)])]); }
    catch { Alert.alert('Could not open photos','Please try again.'); }
  };
  return <ScrollView contentContainerStyle={styles.page}>
    <Text style={styles.pageTitle}>Event Gallery</Text>
    <View style={styles.photoHead}><Text style={styles.hint}>EVENT PHOTOS</Text><Pressable onPress={pick}><Text style={styles.explore}>ADD PHOTOS</Text></Pressable></View>
    <View style={styles.gallery}>{[...localPhotos.map(uri=>({uri})), ...gallery].map((source,i) =>
      <Image key={typeof source==='number'?source:source.uri} source={source} resizeMode="contain" style={[styles.galleryImage, {width:i%3===0?'100%':'49%',aspectRatio:i%3===0?1.85:1.2}]} />)}
    </View>
  </ScrollView>;
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
  const [expanded, setExpanded] = useState(false);
  const close = () => { if (expanded) setExpanded(false); else onClose(); };
  if (!event) return null;
  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={close}>
      <SafeAreaView style={styles.modalSafe}><StatusBar style="light" />{expanded ? <View style={styles.flex}>
          <Image source={event.image} resizeMode="contain" style={{width:'100%',flex:1}} />
          <MetalButton label="CLOSE FLYER" onPress={close} secondary />
        </View> : <ScrollView showsVerticalScrollIndicator={false}>
        <Pressable onPress={onClose} style={finish.back}><Text style={styles.modalCloseText}>‹  EVENT DETAILS</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => setExpanded(true)}>
          <Image source={event.image} style={styles.modalHero} resizeMode="contain" />
          <Text style={finish.caption}>Tap flyer to view full size</Text>
        </Pressable>
        <View style={styles.modalBody}><Text style={styles.eventType}>{event.category}</Text><Text style={styles.modalTitle}>{event.title}</Text><Text style={styles.modalMeta}>{event.date}</Text><Text style={styles.modalMeta}>{event.time} · EASTERN</Text><Text style={styles.modalText}>{event.description}</Text><View style={styles.venueBox}><Text style={styles.venueName}>{event.location}</Text><Text style={styles.eventAddress}>{event.address}</Text></View>
          <Text style={styles.modalHeading}>Your plan</Text><View style={styles.planRow}>{(['Going', 'Interested', "Can't make it"] as Plan[]).map(value => <Pressable key={value} style={[styles.planButton, plan === value && styles.planButtonOn]} onPress={() => onPlan(event.id, value)}><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65} style={styles.planButtonText}>{value.toUpperCase()}</Text></Pressable>)}</View>
          <Text style={styles.modalHeading}>The day at a glance</Text>{event.stops.map((stop, index) => <View key={`${stop.time}-${index}`} style={styles.stop}><View style={styles.stopTime}><Text style={styles.stopHour}>{stop.time}</Text><Text style={styles.stopMeridiem}>{stop.meridiem}</Text></View><View style={styles.stopCopy}><Text style={styles.stopTitle}>{stop.title}</Text><Text style={styles.stopDescription}>{stop.description}</Text></View></View>)}
          <MetalButton label="BACK TO THE COLLECTIVE" onPress={onClose} secondary />
        </View>
      </ScrollView>}</SafeAreaView>
    </Modal>
  );
}

function VehicleModal({ vehicle, onClose }: { vehicle: Vehicle | null; onClose: () => void }) {
  if (!vehicle) return null;
  return <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}><SafeAreaView style={styles.modalSafe}><Image source={vehicle.image} resizeMode="contain" style={styles.modalHero} /><Pressable style={styles.modalClose} onPress={onClose}><Text style={styles.modalCloseText}>CLOSE</Text></Pressable><View style={styles.modalBody}><Text style={styles.vehicleYear}>{vehicle.owner.toUpperCase()} · MEMBER GARAGE</Text><Text style={styles.modalTitle}>{vehicle.model}</Text><Text style={styles.modalText}>{vehicle.description}</Text><Text style={styles.modalHeading}>The build</Text><Text style={styles.modalText}>A space for the details, story, and photos that make every garage its own.</Text><MetalButton label="BACK TO GARAGES" onPress={onClose} secondary /></View></SafeAreaView></Modal>;
}

function TabBar({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  const tabs: { id: Tab; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [{ id: 'home', label: 'HOME', icon: 'home-outline' }, { id: 'events', label: 'EVENTS', icon: 'calendar-outline' }, { id: 'cruise', label: 'CRUISE', icon: 'navigate-outline' }, { id: 'garage', label: 'GARAGE', icon: 'car-sport-outline' }, { id: 'photos', label: 'PHOTOS', icon: 'images-outline' }];
  return <LinearGradient colors={['#30343a', '#171a1e', '#090a0c', '#15181c']} locations={[0, .17, .64, 1]} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.tabbar}><View pointerEvents="none" style={styles.tabbarShine} />{tabs.map(item => <Pressable key={item.id} style={styles.tab} onPress={() => onTab(item.id)}>{tab === item.id && <LinearGradient pointerEvents="none" colors={['#db2633','#8c0712','#310006','#850812']} locations={[0,.27,.7,1]} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.tabActiveMetal}><View style={styles.tabActiveShine} /></LinearGradient>}<Ionicons name={item.icon} size={17} color={tab === item.id ? '#f7f8f9' : '#9da4ad'} /><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[styles.tabLabel, tab === item.id && styles.tabLabelOn]}>{item.label}</Text></Pressable>)}</LinearGradient>;
}

function MetalButton({ label, onPress, secondary = false, disabled = false }: { label: string; onPress: () => void; secondary?: boolean; disabled?: boolean }) {
  return <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.metalButton, pressed && styles.pressed, disabled && styles.disabled]}><LinearGradient colors={secondary ? ['#797b7d','#343638','#151617','#292b2d'] : ['#ff6a73','#d7192a','#8b000c','#350005']} locations={[0,.25,.68,1]} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.metalGradient}><View pointerEvents="none" style={styles.metalShine} /><View pointerEvents="none" style={styles.metalLowerShine} /><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={styles.metalText}>{label}</Text></LinearGradient></Pressable>;
}

const styles = StyleSheet.create({
  globalText: { fontFamily: 'TecBody' },
  scrollHeader: { marginHorizontal: -22, marginTop: -22, marginBottom: 22 },
  eventListTicket: { marginBottom: 14, alignItems: 'center' },
  flex: { flex: 1 }, loading: { flex: 1, backgroundColor: COLORS.black, alignItems: 'center', justifyContent: 'center' }, safe: { flex: 1, backgroundColor: COLORS.black }, appBody: { flex: 1, backgroundColor: '#050608' },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden', backgroundColor: '#050608' }, carbonZone: { position: 'absolute', top: 0, left: 0, right: 0, height: 540, overflow: 'hidden', backgroundColor: '#0b0e12' }, carbonWeave: { position: 'absolute', width: 900, height: 900, top: -280, left: -250, flexDirection: 'row' }, carbonWeaveA: { transform: [{ rotate: '45deg' }], opacity: .1 }, carbonWeaveB: { transform: [{ rotate: '-45deg' }], opacity: .065 }, carbonFiber: { width: 2, height: '100%', marginRight: 10, backgroundColor: '#8b929b' }, carbonFade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }, backdropBase: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }, backdropSweep: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }, backdropRedGlow: { position: 'absolute', width: 480, height: 480, borderRadius: 240, top: -170, right: -270, backgroundColor: 'rgba(135,0,15,.17)', shadowColor: '#d30018', shadowOpacity: .55, shadowRadius: 95, elevation: 2 }, backdropSilverGlow: { position: 'absolute', width: 420, height: 420, borderRadius: 210, top: 250, left: -310, backgroundColor: 'rgba(133,142,155,.08)', shadowColor: '#cbd0d8', shadowOpacity: .18, shadowRadius: 85 }, backdropHairline: { position: 'absolute', top: 2, left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,.09)' },
  pageTransparent: { backgroundColor: 'transparent' },
  launch: { flex: 1, justifyContent: 'space-between', backgroundColor: '#000', paddingHorizontal: 24, paddingTop: Platform.OS === 'android' ? 24 : 38, paddingBottom: Platform.OS === 'android' ? 52 : 36 }, launchArt: { position: 'absolute', top: '6%', bottom: '4%', left: -46, right: -46, width: undefined, height: '90%' }, launchShade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }, launchBrand: { alignItems: 'center', zIndex: 2 }, launchLogo: { width: '100%', height: 82 }, launchTop: { color: '#d6d7da', fontFamily: 'TecBody', fontSize: 13, letterSpacing: 1.2, lineHeight: 21, marginTop: 2 }, launchFocus: { color: '#fff', fontFamily: 'TecBody', fontSize: 15, letterSpacing: 1.2, lineHeight: 22, textShadowColor: '#000', textShadowRadius: 8 }, launchBottom: { color: '#d6d7da', fontFamily: 'TecBody', fontSize: 13, letterSpacing: 1.2, lineHeight: 21 }, launchActions: { zIndex: 2, alignItems: 'center', gap: 18, paddingTop: 20 }, launchButtonRow: { flexDirection: 'row', gap: 12, width: '100%', maxWidth: 420 }, launchButtonCell: { flex: 1 }, previewLink: { color: '#a4a5aa', fontFamily: 'TecBody', textAlign: 'center', textDecorationLine: 'underline', textDecorationColor: '#6b3434', fontSize: 11, letterSpacing: .4 },
  metalButton: { minHeight: 50, borderRadius: 8, borderWidth: 1, borderColor: '#96989c', shadowColor: '#000', shadowOpacity: .96, shadowRadius: 16, shadowOffset: { width: 0, height: 9 }, elevation: 12 }, metalGradient: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,.13)', borderRadius: 7, overflow: 'hidden' }, metalShine: { position: 'absolute', top: 1, left: 7, right: 7, height: 2, backgroundColor: 'rgba(255,255,255,.52)' }, metalLowerShine: { position: 'absolute', bottom: 1, left: 10, right: 10, height: 1, backgroundColor: 'rgba(255,88,98,.45)' }, metalText: { color: COLORS.white, fontFamily: 'sans-serif-condensed', fontStyle: 'italic', fontWeight: 'bold', letterSpacing: .6, fontSize: 13, textAlign: 'center', textShadowColor: '#000', textShadowOffset: {width:0,height:2}, textShadowRadius: 5 }, pressed: { opacity: .82, transform: [{translateY: 1}] }, disabled: { opacity: .5 },
  authSafe: { flex: 1, backgroundColor: COLORS.black }, authContent: { flexGrow: 1, padding: 24, paddingTop: 16, justifyContent: 'center' }, back: { color: COLORS.silver, letterSpacing: 2, marginBottom: 20 }, authLogo: { width: '100%', height: 92 }, authTitle: { color: COLORS.white, fontSize: 34, fontWeight: '900', marginTop: 22 }, authSubtitle: { color: COLORS.muted, fontSize: 16, marginTop: 5, marginBottom: 30 }, field: { marginBottom: 18 }, fieldLabel: { color: COLORS.silver, fontSize: 11, fontWeight: '800', letterSpacing: 1.6, marginBottom: 8 }, input: { color: COLORS.white, backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.line, borderRadius: 4, minHeight: 54, paddingHorizontal: 15, fontSize: 16 }, checkRow: { flexDirection: 'row', gap: 12, marginBottom: 24 }, checkbox: { width: 25, height: 25, borderWidth: 1, borderColor: COLORS.silver, alignItems: 'center', justifyContent: 'center' }, checkboxOn: { backgroundColor: COLORS.red, borderColor: COLORS.red }, checkmark: { color: COLORS.white, fontWeight: '900' }, checkText: { color: COLORS.silver, flex: 1, lineHeight: 20, fontSize: 13 }, switchText: { color: COLORS.white, textAlign: 'center', marginTop: 22, textDecorationLine: 'underline' }, devNote: { color: COLORS.muted, fontSize: 11, textAlign: 'center', marginTop: 25, lineHeight: 16 },
  header: { minHeight: 94, borderBottomWidth: 1, borderBottomColor: '#59616b', justifyContent: 'flex-end', paddingHorizontal: 0, paddingTop: 16, paddingBottom: 4, backgroundColor: '#090b0e', shadowColor: '#000', shadowOpacity: .9, shadowRadius: 14, shadowOffset: {width:0,height:8}, elevation: 12, overflow: 'hidden' }, headerGradient: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }, headerShine: { position: 'absolute', left: 10, right: 10, bottom: 1, height: 1, backgroundColor: 'rgba(183,190,199,.42)' }, headerLogo: { width: '78%', height: 74, zIndex: 2 }, headerTools: { position: 'absolute', top: Platform.OS === 'android' ? 3 : 8, right: 4, flexDirection: 'row', alignItems: 'center', padding: 3, borderWidth: 1, borderColor: '#59616b', borderRadius: 9, backgroundColor: '#111419', zIndex: 3, shadowColor: '#000', shadowOpacity: .8, shadowRadius: 7, elevation: 6 }, bell: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }, avatar: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }, avatarText: { width: 25, height: 25, borderRadius: 13, overflow: 'hidden', backgroundColor: '#8f0101', color: COLORS.white, fontFamily: 'TecBodyBold', textAlign: 'center', textAlignVertical: 'center', fontSize: 11 },
  page: { padding: 22, paddingBottom: 36, backgroundColor: 'transparent' }, greeting: { color: COLORS.white, fontFamily: 'TecDisplay', fontSize: 15, marginBottom: 20, marginTop: 8 }, heroRail: { marginHorizontal: -22, paddingLeft: 22 }, hint: { color: '#8390a3', fontFamily: 'TecBody', fontSize: 11, letterSpacing: .5, marginVertical: 10 }, shortcut: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#17171c', borderWidth: 1, borderColor: '#555d67', padding: 14, borderRadius: 10, marginVertical: 8 }, shortcutIcon: { width: 38, height: 38, backgroundColor: '#560909', borderRadius: 6, alignItems: 'center', justifyContent: 'center' }, shortcutGlyph: { color: COLORS.white, fontFamily: 'TecBodyBold' }, shortcutTitle: { color: COLORS.white, fontFamily: 'TecBodyBold', fontSize: 16 }, shortcutMeta: { color: COLORS.muted, fontFamily: 'TecBody', fontSize: 9, letterSpacing: 1.2 }, sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 22, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#48505a', paddingBottom: 12 }, sectionTitle: { color: COLORS.white, fontFamily: 'TecDisplay', fontSize: 13, borderLeftWidth: 3, borderLeftColor: '#737b85', paddingLeft: 11 }, explore: { color: '#c0c5cc', fontFamily: 'TecDisplay', fontSize: 8, letterSpacing: .7 }, memberTile: { width: 245, height: 205, borderRadius: 10, overflow: 'hidden', marginRight: 12, justifyContent: 'flex-end', padding: 14, borderWidth: 1, borderColor: '#555d67' }, memberImage: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, width: undefined, height: undefined }, memberShade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,.38)' }, memberOwner: { color: COLORS.white, fontFamily: 'TecBodyBold', fontSize: 16 }, memberCar: { color: '#a5abb3', fontFamily: 'TecBody', fontSize: 11 }, motto: { textAlign: 'center', marginTop: 30, paddingTop: 21, borderTopWidth: 1, borderTopColor: '#48505a', fontFamily: 'TecDisplay', transform: [{skewX:'-9deg'}], fontSize: 13 }, mottoWhite: { color: COLORS.white }, mottoGray: { color: COLORS.silver }, mottoRed: { color: '#c30101' },
  pageTitle: { color: COLORS.white, fontSize: 22, fontFamily: 'sans-serif-condensed', fontWeight: 'bold', fontStyle: 'italic', textTransform: 'uppercase', textAlign: 'center', marginTop: 8, lineHeight: 28 }, pageSubtitle: { color: COLORS.muted, fontSize: 13, marginTop: 4, marginBottom: 20 }, segment: { flexDirection: 'row', backgroundColor: '#0d1014', padding: 3, borderRadius: 6, marginBottom: 20, borderWidth: 1, borderColor: '#555d67' }, segmentButton: { flex: 1, minWidth: 0, paddingHorizontal: 6, paddingVertical: 11, alignItems: 'center' }, segmentOn: { backgroundColor: '#641019' }, segmentText: { color: COLORS.white, fontSize: 9, fontFamily: 'TecBodyBold', letterSpacing: .6 }, dayHeading: { color: COLORS.silver, fontSize: 10, fontFamily: 'TecDisplay', letterSpacing: .5, marginBottom: 8, marginTop: 10 }, empty: { color: COLORS.muted, textAlign: 'center', lineHeight: 21, padding: 35 },
  compactTicket: { width: 310, height: 188, marginRight: 12, flexDirection: 'row', borderWidth: 1, borderColor: '#59616b', borderRadius: 10, overflow: 'hidden', backgroundColor: '#0b0e12', shadowColor: '#000', shadowOpacity: .9, shadowRadius: 12, shadowOffset: {width:0,height:7}, elevation: 9 }, compactStub: { width: 70, alignItems: 'center', paddingVertical: 9, paddingHorizontal: 6, borderRightWidth: 1, borderRightColor: '#4c535d' }, compactFlyer: { width: 54, height: 67, borderRadius: 3, backgroundColor: '#060709', marginTop: 7, borderWidth: 1, borderColor: '#555d67' }, compactDateText: { color: '#aeb4bd', fontFamily: 'TecBodyBold', fontSize: 8, letterSpacing: .6 }, compactDay: { color: '#fff', fontFamily: 'TecBodyBold', fontSize: 20, lineHeight: 23 }, compactBody: { flex: 1, paddingVertical: 10, paddingHorizontal: 11 }, compactMetalRule: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 }, compactTitle: { color: '#fff', fontFamily: 'sans-serif-condensed', fontStyle:'italic',fontWeight:'bold', fontSize: 15, lineHeight: 18, marginTop: 2 }, compactTime: { color: '#d8dce2', fontFamily: 'TecBodyBold', fontSize: 10, lineHeight: 13, marginTop: 5 }, compactVenue: { color: '#eef0f3', fontFamily: 'TecBodyBold', fontSize: 10, lineHeight: 13, marginTop: 4 }, compactAddress: { color: '#858d98', fontFamily: 'TecBody', fontSize: 9, lineHeight: 12, marginTop: 1 }, compactFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 5 }, compactAction: { overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 5, borderRadius: 4, borderWidth: 1, borderColor: '#737b85', shadowColor: '#000', shadowOpacity: .75, shadowRadius: 5, shadowOffset: {width:0,height:3}, elevation: 4 },
  eventCard: { backgroundColor: COLORS.panel, borderWidth: 1, borderColor: '#59616b', borderRadius: 12, overflow: 'hidden', marginBottom: 18, width: '100%', shadowColor: '#000', shadowOpacity: .85, shadowRadius: 12, shadowOffset: {width:0,height:7}, elevation: 8 }, eventFlyer: { width: '100%', height: 180, backgroundColor: COLORS.panel2 }, dateBadge: { position: 'absolute', top: 10, left: 10, width: 48, backgroundColor: 'rgba(5,6,8,.94)', borderTopWidth: 2, borderTopColor: '#7a828c', paddingVertical: 4, alignItems: 'center' }, dateWeek: { color: COLORS.silver, fontFamily: 'TecBodyBold', fontSize: 8 }, dateDay: { color: COLORS.white, fontFamily: 'TecBodyBold', fontSize: 21, lineHeight: 24 }, dateMonth: { color: COLORS.red, fontFamily: 'TecBodyBold', fontSize: 9 }, eventCopy: { padding: 14 }, eventMetalRule: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 }, eventType: { color: '#d94854', fontFamily: 'TecBodyBold', fontSize: 9, letterSpacing: .8 }, eventTitle: { color: COLORS.white, fontFamily: 'TecBodyBold', fontSize: 15, lineHeight: 19, marginTop: 4 }, eventTime: { color: COLORS.silver, fontFamily: 'TecBodyBold', fontSize: 12, marginTop: 7 }, eventVenue: { color: COLORS.white, fontFamily: 'TecBodyBold', fontSize: 12, marginTop: 8 }, eventAddress: { color: COLORS.muted, fontFamily: 'TecBody', fontSize: 11, lineHeight: 16, marginTop: 2 }, eventFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }, plan: { color: COLORS.silver, fontFamily: 'TecBodyBold', fontSize: 9 }, viewEvent: { overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 4, borderWidth: 1, borderColor: '#737b85' }, eventActionText: { color: '#fff', fontFamily: 'TecBodyBold', fontStyle:'italic',fontSize: 10, letterSpacing: .6, textShadowColor: '#000', textShadowOffset: {width:0,height:1}, textShadowRadius: 2 },
  vehicleCard: { backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.line, borderRadius: 5, overflow: 'hidden', marginBottom: 18 }, vehicleImage: { width: '100%', height: 215 }, vehicleCopy: { padding: 16 }, vehicleYear: { color: COLORS.red, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 }, vehicleModel: { color: COLORS.white, fontSize: 25, fontWeight: '900', marginTop: 5 }, vehicleDescription: { color: COLORS.silver, marginTop: 8, lineHeight: 20 }, viewGarage: { color: COLORS.white, textAlign: 'right', fontSize: 10, letterSpacing: 1.3, fontWeight: '900', marginTop: 15 }, photoHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, gallery: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 }, galleryImage: { width: '49%', aspectRatio: 1, borderRadius: 3 },
  cruisePage: { flexGrow: 1, padding: 22, paddingBottom: 40, backgroundColor: 'transparent', alignItems: 'center' }, cruiseIconWrap: { width: 70, height: 70, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginTop: 14, backgroundColor: '#4e0000', borderWidth: 1, borderColor: '#737b85', shadowColor: '#000', shadowOpacity: .45, shadowRadius: 14, elevation: 5 }, cruiseEyebrow: { color: '#d2d6dc', fontFamily: 'TecDisplay', fontSize: 8, letterSpacing: 1, marginTop: 18 }, cruiseTitle: { color: '#fff', fontFamily: 'TecDisplay', fontSize: 17, lineHeight: 25, textAlign: 'center', marginTop: 7 }, cruiseIntro: { color: '#9da6b2', fontFamily: 'TecBody', fontSize: 15, textAlign: 'center', marginTop: 6 }, cruisePreview: { width: '100%', height: 210, borderRadius: 15, overflow: 'hidden', marginTop: 24, backgroundColor: '#11151a', borderWidth: 1, borderColor: '#59616b' }, routeLine: { position: 'absolute', width: 260, height: 5, top: 104, left: 28, borderRadius: 3, backgroundColor: '#5f2020', transform: [{ rotate: '23deg' }] }, routeDot: { position: 'absolute', width: 34, height: 34, borderRadius: 17, backgroundColor: '#750707', borderWidth: 2, borderColor: '#8c949e', alignItems: 'center', justifyContent: 'center' }, routeInitial: { color: '#fff', fontFamily: 'TecBodyBold', fontSize: 12 }, routePin: { position: 'absolute', top: 80, left: '47%' }, cruiseFeature: { width: '100%', flexDirection: 'row', gap: 13, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#48505a', alignItems: 'flex-start' }, cruiseFeatureTitle: { color: '#fff', fontFamily: 'TecBodyBold', fontSize: 14 }, cruiseFeatureText: { color: '#929dac', fontFamily: 'TecBody', fontSize: 12, lineHeight: 18, marginTop: 3, paddingRight: 24 }, comingSoonBadge: { marginTop: 26, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 8, backgroundColor: '#4e0000', borderWidth: 1, borderColor: '#737b85' }, comingSoonText: { color: '#fff', fontFamily: 'TecBodyBold', fontSize: 12, letterSpacing: 1.8 }, cruiseNote: { color: '#737d89', fontFamily: 'TecBody', fontSize: 11, textAlign: 'center', marginTop: 14 },
  tabbar: { minHeight: 56, flexDirection: 'row', paddingHorizontal: 3, paddingVertical: 3, marginHorizontal: 18, marginTop: 7, marginBottom: 8, borderRadius: 19, overflow: 'hidden', shadowColor: '#000', shadowOpacity: .95, shadowRadius: 15, shadowOffset: { width: 0, height: 8 }, elevation: 14 }, tabbarShine: { position: 'absolute', top: 1, left: 18, right: 18, height: 1, backgroundColor: 'rgba(255,255,255,.28)' }, tab: { flex: 1, minWidth: 0, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 16, paddingHorizontal: 1, overflow: 'hidden' }, tabActiveMetal: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: 16 }, tabActiveShine: { position: 'absolute', top: 1, left: 7, right: 7, height: 1, backgroundColor: 'rgba(255,205,210,.72)' }, tabLabel: { color: '#9da4ad', fontFamily: 'TecBodyBold', fontSize: 10, letterSpacing: .15, marginTop: 3, textAlign: 'center' }, tabLabelOn: { color: '#fff' },
  testEventCard: { width: 328, height: 430, marginRight: 14, borderWidth: 1, borderColor: '#59616b', borderRadius: 14, overflow: 'hidden', backgroundColor: '#0d1014', shadowColor: '#000', shadowOpacity: .9, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 10 }, testEventFlyer: { width: '100%', height: 184, backgroundColor: '#15191e' }, testDateBadge: { position: 'absolute', top: 10, left: 10, width: 52, backgroundColor: 'rgba(5,6,8,.94)', borderTopWidth: 3, borderTopColor: '#7a828c', paddingVertical: 5, alignItems: 'center' }, testEventCopy: { flex: 1, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 13 }, testEventMetalRule: { position: 'absolute', top: 0, left: 0, right: 0, height: 2 }, testEventTitle: { color: '#fff', fontFamily: 'TecBodyBold', fontSize: 17, lineHeight: 22, marginTop: 5 }, testEventTime: { color: '#c8ccd1', fontFamily: 'TecBodyBold', fontSize: 13, marginTop: 9 }, testEventVenue: { color: '#fff', fontFamily: 'TecBodyBold', fontSize: 13, lineHeight: 18, marginTop: 9 }, testEventAddress: { color: '#9ba2aa', fontFamily: 'TecBody', fontSize: 12, lineHeight: 17, marginTop: 3 }, testEventFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }, testEventAction: { overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 5, borderWidth: 1, borderColor: '#737b85' },
  modalSafe: { flex: 1, backgroundColor: COLORS.black }, modalHero: { width: '100%', height: 280, backgroundColor: COLORS.panel }, modalClose: { position: 'absolute', top: Platform.OS === 'ios' ? 18 : 34, right: 16, backgroundColor: 'rgba(5,6,8,.9)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4 }, modalCloseText: { color: COLORS.white, fontSize: 9, fontFamily: 'TecBodyBold', letterSpacing: .7 }, modalBody: { padding: 20, paddingBottom: 45 }, modalTitle: { color: COLORS.white, fontSize: 19, fontFamily: 'TecDisplay', lineHeight: 27, marginTop: 5 }, modalMeta: { color: COLORS.silver, fontSize: 12, marginTop: 5, fontFamily: 'TecBodyBold' }, modalText: { color: COLORS.silver, fontSize: 13, lineHeight: 20, marginTop: 16 }, venueBox: { backgroundColor: COLORS.panel, borderLeftWidth: 3, borderLeftColor: '#737b85', padding: 13, marginTop: 16 }, venueName: { color: COLORS.white, fontFamily: 'TecBodyBold', fontSize: 14 }, modalHeading: { color: COLORS.white, fontSize: 14, fontFamily: 'TecDisplay', marginTop: 24, marginBottom: 11 }, planRow: { flexDirection: 'row', gap: 6 }, planButton: { flex: 1, minWidth: 0, minHeight: 44, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }, planButtonOn: { backgroundColor: COLORS.redDark, borderColor: COLORS.red }, planButtonText: { color: COLORS.white, fontSize: 8, fontFamily: 'TecBodyBold', textAlign: 'center', letterSpacing: .25 }, stop: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.line, paddingVertical: 14 }, stopTime: { width: 72 }, stopHour: { color: COLORS.white, fontFamily: 'TecBodyBold', fontSize: 17 }, stopMeridiem: { color: COLORS.red, fontFamily: 'TecBodyBold', fontSize: 8 }, stopCopy: { flex: 1 }, stopTitle: { color: COLORS.white, fontFamily: 'TecBodyBold', fontSize: 14 }, stopDescription: { color: COLORS.muted, fontSize: 12, lineHeight: 18, marginTop: 3 }
});
const finish = StyleSheet.create({
  welcome: {flexGrow:1, alignItems:'center', justifyContent:'space-evenly', backgroundColor:COLORS.black, paddingVertical:14},
  brand: {width:'90%',height:104},
  kicker: {fontFamily:'TecDisplay',fontSize:13,letterSpacing:1,color:COLORS.silver, textAlign:'center'},
  heroText: {fontFamily:'sans-serif-condensed',fontWeight:'bold',fontStyle:'italic',fontSize:23,color:COLORS.white},
  actions: {width:'100%',paddingHorizontal:22,gap:12,alignItems:'center'},
  ticket: {backgroundColor:'#141517',borderColor:'#828489',borderWidth:1,borderRadius:8,flexDirection:'row',alignItems:'center',padding:9,gap:8,marginRight:12},
  date: {width:29,alignItems:'center'},
  flyerThumb: {width:65,height:95,backgroundColor:'#09090a',borderRadius:4},
  ticketBody:{flex:1,minWidth:0,gap:1},
  ticketButton:{alignSelf:'stretch',alignItems:'center',padding:5,marginTop:4,borderRadius:4,borderWidth:1,borderColor:'#ad3941'},
  caption:{textAlign:'center',color:COLORS.silver,fontSize:12,padding:8},
  back:{alignSelf:'flex-start',padding:16},
  form:{gap:8,paddingTop:18},
  spec:{borderBottomWidth:StyleSheet.hairlineWidth,borderColor:'#656565',paddingVertical:7}
});
