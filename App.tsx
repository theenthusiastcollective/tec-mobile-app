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
      <EventModal firstName={firstName} onTab={next => {setSelectedEvent(null);setTab(next);}} event={selectedEvent} plan={selectedEvent ? plans[selectedEvent.id] : undefined} onPlan={savePlan} onClose={() => setSelectedEvent(null)} />
      <VehicleModal vehicle={selectedVehicle} onClose={() => setSelectedVehicle(null)} />
    </SafeAreaView>
  );
}

function AppBackdrop() {
  return <LinearGradient pointerEvents="none" colors={['#111110','#080808','#0b0b0b']} style={StyleSheet.absoluteFill}/>;
}

function LaunchScreen({ onRegister, onSignIn, onPreview }: { onRegister: () => void; onSignIn: () => void; onPreview: () => void }) {
  const [space, setSpace] = useState({width: 0, height: 0});
  // Coordinates are measured on the approved 941 × 1672 artwork.
  // Exclude the simulated phone bars and let Android draw its own.
  const top = 47;
  const bottom = 1575;
  const scale = Math.min(space.width / 941, space.height / (bottom - top));
  const actions = [
    {label: 'Register', left: 57, onPress: onRegister},
    {label: 'Sign In', left: 480, onPress: onSignIn}
  ];
  return <SafeAreaView style={look.welcomeSafe}>
    <StatusBar style="light" />
    <View style={look.welcomeFrame} onLayout={({nativeEvent: {layout}}) =>
      setSpace(current => current.width === layout.width && current.height === layout.height
        ? current : {width: layout.width, height: layout.height})}>
      {scale > 0 && <View style={{width: 941 * scale, height: (bottom - top) * scale, overflow: 'hidden'}}>
        <Image source={require('./assets/tec-welcome.png')} resizeMode="stretch"
          accessible accessibilityLabel="The Enthusiast Collective. Meet. Cruise. Connect. South Florida’s auto enthusiast social network. Orange Corvette at sunset."
          style={{position:'absolute', width:941*scale, height:1672*scale, top:-top*scale}} />
        {actions.map(action => <Pressable key={action.label} accessibilityRole="button" accessibilityLabel={action.label}
          onPress={action.onPress} style={({pressed}) => ({position:'absolute',left:action.left*scale,top:(1335-top)*scale,
            width:403*scale,height:Math.max(44,123*scale),borderRadius:9,backgroundColor:pressed?'rgba(255,255,255,.12)':'transparent'})} />)}
      </View>}
    </View>
    {!backendConfigured && <Pressable onPress={onPreview} accessibilityRole="button" style={look.preview}><Text style={styles.previewLink}>Explore development preview</Text></Pressable>}
  </SafeAreaView>;
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

const trim = {
  'wordmark': require('./assets/wordmark.png'),
  'motto': require('./assets/motto.png'),
  'my-garage': require('./assets/my-garage.png'),
  'member-garages': require('./assets/member-garages.png'),
  'events-heading': require('./assets/events-heading.png'),
  'details-heading': require('./assets/details-heading.png'),
  'garage-heading': require('./assets/garage-heading.png'),
  'gallery-heading': require('./assets/gallery-heading.png'),
  'view-event': require('./assets/view-event.png'),
  'edit-garage': require('./assets/edit-garage.png'),
  'home-off': require('./assets/home-off.png'),
  'home-on': require('./assets/home-on.png'),
  'events-off': require('./assets/events-off.png'),
  'events-on': require('./assets/events-on.png'),
  'cruise-off': require('./assets/cruise-off.png'),
  'garage-off': require('./assets/garage-off.png'),
  'gallery-off': require('./assets/gallery-off.png'),
  'garage-on': require('./assets/garage-on.png'),
  'gallery-on': require('./assets/gallery-on.png'),
  'cruise-on': require('./assets/cruise-on.png'),
} as const;

function TrimArt({name, label, ratio}: {name:keyof typeof trim; label?:string; ratio?:number}) {
  return <Image source={trim[name]} accessible={!!label} accessibilityLabel={label}
    resizeMode="stretch" style={ratio ? {width:'100%',height:undefined,aspectRatio:ratio} : {width:'100%',height:'100%'}} />;
}

function Header({firstName,onAccount}:{firstName:string;onAccount:()=>void}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={'The Enthusiast Collective · Account for ' + firstName}
    onPress={onAccount} style={metal.header}><TrimArt name="wordmark" ratio={280/47} /></Pressable>;
}

function Motto() {
  return <View style={metal.motto}><TrimArt name="motto" ratio={325/33} label="Meet. Cruise. Connect." /></View>;
}

function ArtHeading({name,label}:{name:'events-heading'|'details-heading'|'garage-heading'|'gallery-heading';label:string}){
  const widths = {'events-heading':.82,'details-heading':.66,'garage-heading':.51,'gallery-heading':.54};
  const ratios = {'events-heading':239/22,'details-heading':177/21,'garage-heading':167/20,'gallery-heading':178/21};
  return <View accessibilityRole="header" accessibilityLabel={label}
    style={{width:(widths[name]*100+'%') as `${number}%`,alignSelf:'center',marginVertical:5}}>
    <TrimArt name={name} ratio={ratios[name]} />
  </View>;
}

function HomeLink({label, icon, onPress, expanded}: {label:string; icon:React.ComponentProps<typeof MaterialCommunityIcons>['name']; onPress:()=>void; expanded?:boolean}) {
  if (label === 'My Garage' || label === 'Member Garages') {
    return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{expanded}}
      style={({pressed})=>[metal.garageShortcut,pressed && styles.pressed]} onPress={onPress}>
      <TrimArt name={label==='My Garage'?'my-garage':'member-garages'} ratio={278/70} />
    </Pressable>;
  }
  return <Pressable accessibilityRole="button" accessibilityState={{expanded}} onPress={onPress} style={look.homeLink}>
    <LinearGradient pointerEvents="none" style={StyleSheet.absoluteFill} colors={['#393938','#242423','#121212','#191918']} locations={[0,.29,.83,1]} />
    <MaterialCommunityIcons name={icon} size={32} color="#dededc" />
    <Text style={look.linkLabel}>{label}</Text>
    <Ionicons name={expanded?'chevron-down':'chevron-forward'} size={19} color="#c5c5c3" />
  </Pressable>;
}

function Home({ firstName, plans, onEvent, onTab, onVehicle, onPerks }: { onPerks: () => void; firstName: string; plans: Record<string, Plan>; onEvent: (e: TecEvent) => void; onTab: (t: Tab) => void; onVehicle: (v: Vehicle) => void }) {
  const [membersOpen, setMembersOpen] = useState(false);
  return (
    <ScrollView contentContainerStyle={[styles.page, metal.page]} showsVerticalScrollIndicator={false}>
      <View style={metal.homeHeader}><Header firstName={firstName} onAccount={() => Alert.alert('Account', 'Account settings, privacy, and account deletion will live here.')} /></View>
      <Text style={metal.greeting}>Good to see you, {firstName}.</Text>
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{flexGrow:0,marginBottom:8}}>{events.map(event => <EventCard key={event.id} event={event} plan={plans[event.id]} compact onPress={() => onEvent(event)} />)}</ScrollView>
      <HomeLink label="My Garage" icon="garage" onPress={() => onTab('garage')} />
      <HomeLink label="Member Garages" icon="account-group" expanded={membersOpen} onPress={() => setMembersOpen(open => !open)} />
      {membersOpen && sampleVehicles.map(vehicle => <Pressable key={vehicle.id} onPress={() => onVehicle(vehicle)} style={styles.shortcut}>
        <Image source={vehicle.image} style={{width:72,height:50}} resizeMode="contain" />
        <View><Text style={styles.memberOwner}>{vehicle.owner}</Text><Text style={styles.memberCar}>{vehicle.model}</Text></View>
      </Pressable>)}
      <Motto />
      <Pressable accessibilityRole="button" onPress={onPerks} style={metal.perks}><Ionicons name="pricetag-outline" size={15} color="#c7c6c2"/><Text style={metal.perksText}>Member Perks</Text></Pressable>
    </ScrollView>
  );
}

function Events({ plans, onEvent }: { plans: Record<string, Plan>; onEvent: (e: TecEvent) => void }) {
  const [filter, setFilter] = useState<'upcoming' | 'mine'>('upcoming');
  const visible = filter === 'mine' ? events.filter(event => plans[event.id] === 'Going' || plans[event.id] === 'Interested') : events;
  return (
    <ScrollView contentContainerStyle={[styles.page, metal.page]} showsVerticalScrollIndicator={false}>
      <ArtHeading name="events-heading" label="Good days ahead." /><Text style={metal.subtitle}>Find your next reason to get out.</Text>

      {visible.length ? visible.map(event => <View key={event.id} style={styles.eventListTicket}><EventCard event={event} plan={plans[event.id]} onPress={() => onEvent(event)} /></View>) : <Text style={styles.empty}>Your next plan starts here. Open an event and choose Going or Interested.</Text>}
      <View style={styles.segment}><Pressable style={[styles.segmentButton, filter === 'upcoming' && styles.segmentOn]} onPress={() => setFilter('upcoming')}><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={styles.segmentText}>UPCOMING EVENTS</Text></Pressable><Pressable style={[styles.segmentButton, filter === 'mine' && styles.segmentOn]} onPress={() => setFilter('mine')}><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={styles.segmentText}>MY PLANS</Text></Pressable></View>
    </ScrollView>
  );
}

function EventCard({ event, plan, onPress, compact = false }: { event: TecEvent; plan?: Plan; onPress: () => void; compact?: boolean }) {
  const { width } = useWindowDimensions();
  const cardWidth=Math.min(width,600)-24;
  const posterWidth=cardWidth*(compact?.30:.25);
  return <Pressable accessibilityRole="button" accessibilityLabel={'View ' + event.title} onPress={onPress}
    style={[metal.ticket,{width:cardWidth,minHeight:cardWidth*(compact?.50:.33)}]}>
    <LinearGradient pointerEvents="none" colors={['#272726','#151514','#080808']} style={StyleSheet.absoluteFill}/>
    <View style={metal.date}><Text style={metal.dateText}>{event.weekday}</Text><Text style={metal.dateText}>{event.month}</Text><Text style={metal.day}>{event.day}</Text></View>
    <View style={[metal.poster,{width:posterWidth,height:posterWidth*(compact?1.45:1.14)}]}>
      <Image resizeMode="contain" source={event.image} style={look.photo}/>
    </View>
    <View style={metal.copy}><Text style={metal.eventName}>{event.title}</Text>
      {compact && <Text style={metal.meta}>◷  {event.time}</Text>}
      <View style={look.infoRow}><Ionicons name="location" size={14} color="#ecebe8"/><Text style={[metal.meta,{flex:1}]}>{event.location}</Text></View>
      <Text style={metal.address}>{event.address}</Text>
      {plan && <Text style={styles.plan}>{plan}</Text>}
      <View style={{width:'100%',marginTop:4}}><TrimArt name="view-event" ratio={141/24} /></View>
    </View>
  </Pressable>;
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
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={metal.page}>
    {editing ? <Text style={styles.pageTitle}>Set Up Your Garage</Text> : <ArtHeading name="garage-heading" label="Your Garage" />}
    {editing ? <View style={finish.form}>
      <Pressable accessibilityRole="button" style={styles.shortcut} onPress={pick}><MaterialCommunityIcons name="garage" color={COLORS.silver} size={28}/><Text style={styles.shortcutTitle}>Add Photos</Text></Pressable>
      {draft.photos.map(uri => <Image key={uri} source={{uri}} resizeMode="contain" style={styles.vehicleImage} />)}
      {garageFields.map(([id,label],i) => <Field key={id} label={label} value={draft[id]} multiline={i>=5} numberOfLines={i>=5?3:1}
        keyboardType={id==='year'?'number-pad':'default'} onChangeText={value => setDraft(d => ({...d,[id]:value}))} />)}
      <MetalButton label="SAVE MY GARAGE" onPress={save} disabled={busy} />
      <MetalButton label="CANCEL" secondary disabled={busy} onPress={() => setEditing(false)} />
    </View> : <>
      {saved && <View style={{gap:2}}>
        {saved.photos.map(uri => <Image key={uri} source={{uri}} resizeMode="contain" style={{width:'100%',height:152,backgroundColor:'#141414',borderWidth:1,borderColor:'#92928e',borderRadius:6}} />)}
        {garageFields.filter(([id])=>saved[id]).map(([id,label])=><View key={id} style={finish.spec}><Text style={{color:'#ddd',width:'30%',fontFamily:'TecBodyBold',fontStyle:'italic',fontSize:11}}>{label.toUpperCase()}</Text><Text style={[metal.meta,{flex:1}]}>{saved[id]}</Text></View>)}
      </View>}
      {saved ? <Pressable accessibilityRole="button" accessibilityLabel="Edit my garage" style={{marginVertical:8,minHeight:44,justifyContent:'center'}} onPress={()=>{setDraft(saved);setEditing(true)}}><TrimArt name="edit-garage" ratio={323/29}/></Pressable>
        : <MetalButton label="SET UP MY GARAGE" disabled={!ready} onPress={()=>{setDraft({...blankCar,photos:[]});setEditing(true)}} />}
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
  return <ScrollView contentContainerStyle={metal.page}>
    <ArtHeading name="gallery-heading" label="Event Gallery"/>

    <View style={styles.gallery}>{[...localPhotos.map(uri=>({uri})), ...gallery].map((source,i) => {
      const wide = i % 8 === 0 || i % 8 === 2 || i % 8 === 5 || i % 8 === 7;
      return <View key={typeof source==='number'?source:source.uri}
        style={[look.photoTile,{width:wide?'59%':'39%',aspectRatio:wide?2.15:1.42}]}>
        <Image source={source} accessibilityLabel={'Event photo ' + (i+1)} resizeMode="contain" style={look.photo} />
      </View>;
    })}
    </View>
    <Pressable accessibilityRole="button" onPress={pick} style={metal.perks}><Text style={metal.perksText}>Add photos</Text></Pressable>
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

function EventModal({ event, plan, onPlan, onClose, firstName, onTab }: { firstName:string; onTab:(tab:Tab)=>void; event: TecEvent | null; plan?: Plan; onPlan: (id: string, p: Plan) => void; onClose: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const close = () => { if (expanded) setExpanded(false); else onClose(); };
  if (!event) return null;
  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={close}>
      <SafeAreaView style={styles.modalSafe}><StatusBar style="light" />{expanded ? <View style={styles.flex}>
          <Image source={event.image} resizeMode="contain" style={{width:'100%',flex:1}} />
          <MetalButton label="CLOSE FLYER" onPress={close} secondary />
        </View> : <><ScrollView showsVerticalScrollIndicator={false}>
        <Header firstName={firstName} onAccount={() => Alert.alert('Account',firstName)} />
        <View style={{position:'relative',justifyContent:'center',minHeight:32}}>
          <ArtHeading name="details-heading" label="Event Details"/>
          <Pressable accessibilityRole="button" accessibilityLabel="Back to events" onPress={onClose} style={{position:'absolute',left:10,padding:9}}><Ionicons name="chevron-back" size={22} color="#eee" /></Pressable>
        </View>
        <Pressable accessibilityRole="button" onPress={() => setExpanded(true)}>
          <Image source={event.image} style={metal.detailFlyer} resizeMode="contain" />
          <Text style={finish.caption}>Tap flyer to view full size</Text>
        </Pressable>
        <View style={[look.logistics,{padding:8}]}><Text style={metal.eventName}>{event.title}</Text>
          <Text style={metal.meta}>{event.date}</Text><Text style={metal.meta}>{event.time}</Text>
          <Text style={metal.meta}>{event.location}</Text><Text style={metal.address}>{event.address}</Text>
          <Text style={look.subheading}>RSVP</Text><View style={styles.planRow}>{(['Going','Interested',"Can't make it"] as Plan[]).map(value => {
            const selected=plan===value;
            const label=value==='Interested'?'Maybe':value==="Can't make it"?'Not going':'Going';
            return <Pressable key={value} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{selected}}
              style={metal.rsvpTouch} onPress={()=>onPlan(event.id,value)}>
              <LinearGradient colors={selected?['#b02724','#770808','#370303']:['#444442','#252524','#111110']}
                style={[metal.rsvpFace,selected && {borderColor:'#c6534e'}]}>
                <Text numberOfLines={1} style={metal.rsvpText}>{label.toUpperCase()}{selected?'  ✓':''}</Text>
              </LinearGradient>
            </Pressable>;
          })}</View>
          <Text style={look.subheading}>Schedule</Text>{event.stops.map((stop, index) => <View key={`${stop.time}-${index}`} style={styles.stop}><View style={styles.stopTime}><Text style={styles.stopHour}>{stop.time}</Text><Text style={styles.stopMeridiem}>{stop.meridiem}</Text></View><View style={styles.stopCopy}><Text style={styles.stopTitle}>{stop.title}</Text><Text style={styles.stopDescription}>{stop.description}</Text></View></View>)}
          <Text style={styles.modalText}>{event.description}</Text>
        </View>
      </ScrollView><TabBar tab="events" onTab={onTab} /></>}</SafeAreaView>
    </Modal>
  );
}

function VehicleModal({ vehicle, onClose }: { vehicle: Vehicle | null; onClose: () => void }) {
  if (!vehicle) return null;
  return <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}><SafeAreaView style={styles.modalSafe}><Image source={vehicle.image} resizeMode="contain" style={styles.modalHero} /><Pressable style={styles.modalClose} onPress={onClose}><Text style={styles.modalCloseText}>CLOSE</Text></Pressable><View style={styles.modalBody}><Text style={styles.vehicleYear}>{vehicle.owner.toUpperCase()} · MEMBER GARAGE</Text><Text style={styles.modalTitle}>{vehicle.model}</Text><Text style={styles.modalText}>{vehicle.description}</Text><Text style={styles.modalHeading}>The build</Text><Text style={styles.modalText}>A space for the details, story, and photos that make every garage its own.</Text><MetalButton label="BACK TO GARAGES" onPress={onClose} secondary /></View></SafeAreaView></Modal>;
}

function TabBar({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  const tabs: {id:Tab; art:'home'|'events'|'cruise'|'garage'|'gallery'}[] = [
    {id:'home',art:'home'},{id:'events',art:'events'},{id:'cruise',art:'cruise'},
    {id:'garage',art:'garage'},{id:'photos',art:'gallery'}
  ];
  return <View style={metal.nav}>{tabs.map(item=><Pressable key={item.id} accessibilityRole="tab"
    accessibilityLabel={item.id} accessibilityState={{selected:tab===item.id}} onPress={()=>onTab(item.id)}
    style={({pressed})=>[{flex:1},pressed&&styles.pressed]}>
    <TrimArt name={`${item.art}-${tab===item.id?'on':'off'}`} />
  </Pressable>)}</View>;
}

function MetalButton({ label, onPress, secondary = false, disabled = false }: { label: string; onPress: () => void; secondary?: boolean; disabled?: boolean }) {
  return <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.metalButton, pressed && styles.pressed, disabled && styles.disabled]}><LinearGradient colors={secondary ? ['#797b7d','#343638','#151617','#292b2d'] : ['#a72a2c','#921014','#520609','#2e0404']} locations={[0,.25,.68,1]} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.metalGradient}><View pointerEvents="none" style={styles.metalShine} /><View pointerEvents="none" style={styles.metalLowerShine} /><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={[styles.metalText,{fontFamily:'TecBodyBold',fontWeight:'normal',fontStyle:'normal',transform:[{skewX:'-10deg'}]}]}>{label}</Text></LinearGradient></Pressable>;
}

const styles = StyleSheet.create({
  globalText: { fontFamily: 'TecBody' },
  scrollHeader: { marginHorizontal: -22, marginTop: -22, marginBottom: 12 },
  eventListTicket: { marginBottom: 6, alignItems: 'center' },
  flex: { flex: 1 }, loading: { flex: 1, backgroundColor: COLORS.black, alignItems: 'center', justifyContent: 'center' }, safe: { flex: 1, backgroundColor: COLORS.black }, appBody: { flex: 1, backgroundColor: '#050608' },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden', backgroundColor: '#050608' }, carbonZone: { position: 'absolute', top: 0, left: 0, right: 0, height: 190, overflow: 'hidden', backgroundColor: '#0b0e12' }, carbonWeave: { position: 'absolute', width: 900, height: 900, top: -280, left: -250, flexDirection: 'row' }, carbonWeaveA: { transform: [{ rotate: '45deg' }], opacity: .1 }, carbonWeaveB: { transform: [{ rotate: '-45deg' }], opacity: .065 }, carbonFiber: { width: 2, height: '100%', marginRight: 10, backgroundColor: '#8b929b' }, carbonFade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }, backdropBase: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }, backdropSweep: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }, backdropRedGlow: { position: 'absolute', width: 480, height: 480, borderRadius: 240, top: -170, right: -270, backgroundColor: 'rgba(135,0,15,.17)', shadowColor: '#d30018', shadowOpacity: .55, shadowRadius: 95, elevation: 2 }, backdropSilverGlow: { position: 'absolute', width: 420, height: 420, borderRadius: 210, top: 250, left: -310, backgroundColor: 'rgba(133,142,155,.08)', shadowColor: '#cbd0d8', shadowOpacity: .18, shadowRadius: 85 }, backdropHairline: { position: 'absolute', top: 2, left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,.09)' },
  pageTransparent: { backgroundColor: 'transparent' },
  launch: { flex: 1, justifyContent: 'space-between', backgroundColor: '#000', paddingHorizontal: 24, paddingTop: Platform.OS === 'android' ? 24 : 38, paddingBottom: Platform.OS === 'android' ? 52 : 36 }, launchArt: { position: 'absolute', top: '6%', bottom: '4%', left: -46, right: -46, width: undefined, height: '90%' }, launchShade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }, launchBrand: { alignItems: 'center', zIndex: 2 }, launchLogo: { width: '100%', height: 82 }, launchTop: { color: '#d6d7da', fontFamily: 'TecBody', fontSize: 13, letterSpacing: 1.2, lineHeight: 21, marginTop: 2 }, launchFocus: { color: '#fff', fontFamily: 'TecBody', fontSize: 15, letterSpacing: 1.2, lineHeight: 22, textShadowColor: '#000', textShadowRadius: 8 }, launchBottom: { color: '#d6d7da', fontFamily: 'TecBody', fontSize: 13, letterSpacing: 1.2, lineHeight: 21 }, launchActions: { zIndex: 2, alignItems: 'center', gap: 18, paddingTop: 20 }, launchButtonRow: { flexDirection: 'row', gap: 12, width: '100%', maxWidth: 420 }, launchButtonCell: { flex: 1 }, previewLink: { color: '#a4a5aa', fontFamily: 'TecBody', textAlign: 'center', textDecorationLine: 'underline', textDecorationColor: '#6b3434', fontSize: 11, letterSpacing: .4 },
  metalButton: { minHeight: 50, borderRadius: 8, borderWidth: 1, borderColor: '#96989c', shadowColor: '#000', shadowOpacity: .96, shadowRadius: 16, shadowOffset: { width: 0, height: 9 }, elevation: 12 }, metalGradient: { flexGrow: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,.13)', borderRadius: 7, overflow: 'hidden' }, metalShine: { position: 'absolute', top: 1, left: 7, right: 7, height: 2, backgroundColor: 'rgba(255,255,255,.52)' }, metalLowerShine: { position: 'absolute', bottom: 1, left: 10, right: 10, height: 1, backgroundColor: 'rgba(255,88,98,.45)' }, metalText: { color: COLORS.white, fontFamily: 'sans-serif-condensed', fontStyle: 'italic', fontWeight: 'bold', letterSpacing: .6, fontSize: 13, textAlign: 'center', textShadowColor: '#000', textShadowOffset: {width:0,height:2}, textShadowRadius: 5 }, pressed: { opacity: .82, transform: [{translateY: 1}] }, disabled: { opacity: .5 },
  authSafe: { flex: 1, backgroundColor: COLORS.black }, authContent: { flexGrow: 1, padding: 24, paddingTop: 16, justifyContent: 'center' }, back: { color: COLORS.silver, letterSpacing: 2, marginBottom: 20 }, authLogo: { width: '100%', height: 92 }, authTitle: { color: COLORS.white, fontSize: 34, fontWeight: '900', marginTop: 22 }, authSubtitle: { color: COLORS.muted, fontSize: 16, marginTop: 5, marginBottom: 30 }, field: { marginBottom: 18 }, fieldLabel: { color: COLORS.silver, fontSize: 11, fontWeight: '800', letterSpacing: 1.6, marginBottom: 8 }, input: { color: COLORS.white, backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.line, borderRadius: 4, minHeight: 54, paddingHorizontal: 15, fontSize: 16 }, checkRow: { flexDirection: 'row', gap: 12, marginBottom: 24 }, checkbox: { width: 25, height: 25, borderWidth: 1, borderColor: COLORS.silver, alignItems: 'center', justifyContent: 'center' }, checkboxOn: { backgroundColor: COLORS.red, borderColor: COLORS.red }, checkmark: { color: COLORS.white, fontWeight: '900' }, checkText: { color: COLORS.silver, flex: 1, lineHeight: 20, fontSize: 13 }, switchText: { color: COLORS.white, textAlign: 'center', marginTop: 22, textDecorationLine: 'underline' }, devNote: { color: COLORS.muted, fontSize: 11, textAlign: 'center', marginTop: 25, lineHeight: 16 },
  header: { minHeight: 94, borderBottomWidth: 1, borderBottomColor: '#59616b', justifyContent: 'flex-end', paddingHorizontal: 0, paddingTop: 16, paddingBottom: 4, backgroundColor: '#090b0e', shadowColor: '#000', shadowOpacity: .9, shadowRadius: 14, shadowOffset: {width:0,height:8}, elevation: 12, overflow: 'hidden' }, headerGradient: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }, headerShine: { position: 'absolute', left: 10, right: 10, bottom: 1, height: 1, backgroundColor: 'rgba(183,190,199,.42)' }, headerLogo: { width: '78%', height: 74, zIndex: 2 }, headerTools: { position: 'absolute', top: Platform.OS === 'android' ? 3 : 8, right: 4, flexDirection: 'row', alignItems: 'center', padding: 3, borderWidth: 1, borderColor: '#59616b', borderRadius: 9, backgroundColor: '#111419', zIndex: 3, shadowColor: '#000', shadowOpacity: .8, shadowRadius: 7, elevation: 6 }, bell: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }, avatar: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }, avatarText: { width: 25, height: 25, borderRadius: 13, overflow: 'hidden', backgroundColor: '#8f0101', color: COLORS.white, fontFamily: 'TecBodyBold', textAlign: 'center', textAlignVertical: 'center', fontSize: 11 },
  page: { padding: 22, paddingBottom: 36, backgroundColor: 'transparent' }, greeting: { color: COLORS.white, fontFamily:'TecBodyBold', transform:[{skewX:'-9deg'}], textAlign:'center', fontSize:23, marginBottom:16, marginTop:2 }, heroRail: { marginHorizontal: -22, paddingLeft: 22 }, hint: { color: '#8390a3', fontFamily: 'TecBody', fontSize: 11, letterSpacing: .5, marginVertical: 10 }, shortcut: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#17171c', borderWidth: 1, borderColor: '#555d67', padding: 14, borderRadius: 10, marginVertical: 8 }, shortcutIcon: { width: 38, height: 38, backgroundColor: '#560909', borderRadius: 6, alignItems: 'center', justifyContent: 'center' }, shortcutGlyph: { color: COLORS.white, fontFamily: 'TecBodyBold' }, shortcutTitle: { color: COLORS.white, fontFamily: 'TecBodyBold', fontSize: 16 }, shortcutMeta: { color: COLORS.muted, fontFamily: 'TecBody', fontSize: 9, letterSpacing: 1.2 }, sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 22, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#48505a', paddingBottom: 12 }, sectionTitle: { color: COLORS.white, fontFamily: 'TecDisplay', fontSize: 13, borderLeftWidth: 3, borderLeftColor: '#737b85', paddingLeft: 11 }, explore: { color: '#c0c5cc', fontFamily: 'TecDisplay', fontSize: 8, letterSpacing: .7 }, memberTile: { width: 245, height: 205, borderRadius: 10, overflow: 'hidden', marginRight: 12, justifyContent: 'flex-end', padding: 14, borderWidth: 1, borderColor: '#555d67' }, memberImage: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, width: undefined, height: undefined }, memberShade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,.38)' }, memberOwner: { color: COLORS.white, fontFamily: 'TecBodyBold', fontSize: 16 }, memberCar: { color: '#a5abb3', fontFamily: 'TecBody', fontSize: 11 }, motto: { textAlign: 'center', marginTop: 30, paddingTop: 21, borderTopWidth: 1, borderTopColor: '#48505a', fontFamily: 'TecDisplay', transform: [{skewX:'-9deg'}], fontSize: 13 }, mottoWhite: { color: COLORS.white }, mottoGray: { color: COLORS.silver }, mottoRed: { color: '#c30101' },
  pageTitle: { color: COLORS.white, fontSize: 22, fontFamily:'TecBodyBold', transform:[{skewX:'-11deg'}], textTransform: 'uppercase', textAlign: 'center', marginTop: 8, lineHeight: 28 }, pageSubtitle: { textAlign:'center', color: COLORS.muted, fontSize: 13, marginTop: 4, marginBottom: 20 }, segment: { flexDirection: 'row', backgroundColor: '#0d1014', padding: 3, borderRadius: 6, marginBottom: 20, borderWidth: 1, borderColor: '#555d67' }, segmentButton: { flex: 1, minWidth: 0, paddingHorizontal: 6, paddingVertical: 11, alignItems: 'center' }, segmentOn: { backgroundColor: '#641019' }, segmentText: { color: COLORS.white, fontSize: 9, fontFamily: 'TecBodyBold', letterSpacing: .6 }, dayHeading: { color: COLORS.silver, fontSize: 10, fontFamily: 'TecDisplay', letterSpacing: .5, marginBottom: 8, marginTop: 10 }, empty: { color: COLORS.muted, textAlign: 'center', lineHeight: 21, padding: 35 },
  compactTicket: { width: 310, height: 188, marginRight: 12, flexDirection: 'row', borderWidth: 1, borderColor: '#59616b', borderRadius: 10, overflow: 'hidden', backgroundColor: '#0b0e12', shadowColor: '#000', shadowOpacity: .9, shadowRadius: 12, shadowOffset: {width:0,height:7}, elevation: 9 }, compactStub: { width: 70, alignItems: 'center', paddingVertical: 9, paddingHorizontal: 6, borderRightWidth: 1, borderRightColor: '#4c535d' }, compactFlyer: { width: 54, height: 67, borderRadius: 3, backgroundColor: '#060709', marginTop: 7, borderWidth: 1, borderColor: '#555d67' }, compactDateText: { color: '#aeb4bd', fontFamily: 'TecBodyBold', fontSize: 8, letterSpacing: .6 }, compactDay: { color: '#fff', fontFamily: 'TecBodyBold', fontSize: 20, lineHeight: 23 }, compactBody: { flex: 1, paddingVertical: 10, paddingHorizontal: 11 }, compactMetalRule: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 }, compactTitle: { color: '#fff', fontFamily: 'sans-serif-condensed', fontStyle:'italic',fontWeight:'bold', fontSize: 15, lineHeight: 18, marginTop: 2 }, compactTime: { color: '#d8dce2', fontFamily: 'TecBodyBold', fontSize: 10, lineHeight: 13, marginTop: 5 }, compactVenue: { color: '#eef0f3', fontFamily: 'TecBodyBold', fontSize: 10, lineHeight: 13, marginTop: 4 }, compactAddress: { color: '#858d98', fontFamily: 'TecBody', fontSize: 9, lineHeight: 12, marginTop: 1 }, compactFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 5 }, compactAction: { overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 5, borderRadius: 4, borderWidth: 1, borderColor: '#737b85', shadowColor: '#000', shadowOpacity: .75, shadowRadius: 5, shadowOffset: {width:0,height:3}, elevation: 4 },
  eventCard: { backgroundColor: COLORS.panel, borderWidth: 1, borderColor: '#59616b', borderRadius: 12, overflow: 'hidden', marginBottom: 18, width: '100%', shadowColor: '#000', shadowOpacity: .85, shadowRadius: 12, shadowOffset: {width:0,height:7}, elevation: 8 }, eventFlyer: { width: '100%', height: 180, backgroundColor: COLORS.panel2 }, dateBadge: { position: 'absolute', top: 10, left: 10, width: 48, backgroundColor: 'rgba(5,6,8,.94)', borderTopWidth: 2, borderTopColor: '#7a828c', paddingVertical: 4, alignItems: 'center' }, dateWeek: { color: COLORS.silver, fontFamily: 'TecBodyBold', fontSize: 8 }, dateDay: { color: COLORS.white, fontFamily: 'TecBodyBold', fontSize: 21, lineHeight: 24 }, dateMonth: { color: COLORS.red, fontFamily: 'TecBodyBold', fontSize: 9 }, eventCopy: { padding: 14 }, eventMetalRule: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 }, eventType: { color: '#d94854', fontFamily: 'TecBodyBold', fontSize: 9, letterSpacing: .8 }, eventTitle: { color: COLORS.white, fontFamily: 'TecBodyBold', fontSize: 15, lineHeight: 19, marginTop: 4 }, eventTime: { color: COLORS.silver, fontFamily: 'TecBodyBold', fontSize: 12, marginTop: 7 }, eventVenue: { color: COLORS.white, fontFamily: 'TecBodyBold', fontSize: 12, marginTop: 8 }, eventAddress: { color: COLORS.muted, fontFamily: 'TecBody', fontSize: 11, lineHeight: 16, marginTop: 2 }, eventFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }, plan: { color: COLORS.silver, fontFamily: 'TecBodyBold', fontSize: 9 }, viewEvent: { overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 4, borderWidth: 1, borderColor: '#737b85' }, eventActionText: { color: '#fff', fontFamily: 'TecBodyBold', fontStyle:'italic',fontSize: 10, letterSpacing: .6, textShadowColor: '#000', textShadowOffset: {width:0,height:1}, textShadowRadius: 2 },
  vehicleCard: { backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.line, borderRadius: 5, overflow: 'hidden', marginBottom: 18 }, vehicleImage: { width: '100%', height: 215 }, vehicleCopy: { padding: 16 }, vehicleYear: { color: COLORS.red, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 }, vehicleModel: { color: COLORS.white, fontSize: 25, fontWeight: '900', marginTop: 5 }, vehicleDescription: { color: COLORS.silver, marginTop: 8, lineHeight: 20 }, viewGarage: { color: COLORS.white, textAlign: 'right', fontSize: 10, letterSpacing: 1.3, fontWeight: '900', marginTop: 15 }, photoHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, gallery: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 }, galleryImage: { width: '49%', aspectRatio: 1, borderRadius: 3 },
  cruisePage: { flexGrow: 1, padding: 22, paddingBottom: 40, backgroundColor: 'transparent', alignItems: 'center' }, cruiseIconWrap: { width: 70, height: 70, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginTop: 14, backgroundColor: '#4e0000', borderWidth: 1, borderColor: '#737b85', shadowColor: '#000', shadowOpacity: .45, shadowRadius: 14, elevation: 5 }, cruiseEyebrow: { color: '#d2d6dc', fontFamily: 'TecDisplay', fontSize: 8, letterSpacing: 1, marginTop: 18 }, cruiseTitle: { color: '#fff', fontFamily: 'TecDisplay', fontSize: 17, lineHeight: 25, textAlign: 'center', marginTop: 7 }, cruiseIntro: { color: '#9da6b2', fontFamily: 'TecBody', fontSize: 15, textAlign: 'center', marginTop: 6 }, cruisePreview: { width: '100%', height: 210, borderRadius: 15, overflow: 'hidden', marginTop: 24, backgroundColor: '#11151a', borderWidth: 1, borderColor: '#59616b' }, routeLine: { position: 'absolute', width: 260, height: 5, top: 104, left: 28, borderRadius: 3, backgroundColor: '#5f2020', transform: [{ rotate: '23deg' }] }, routeDot: { position: 'absolute', width: 34, height: 34, borderRadius: 17, backgroundColor: '#750707', borderWidth: 2, borderColor: '#8c949e', alignItems: 'center', justifyContent: 'center' }, routeInitial: { color: '#fff', fontFamily: 'TecBodyBold', fontSize: 12 }, routePin: { position: 'absolute', top: 80, left: '47%' }, cruiseFeature: { width: '100%', flexDirection: 'row', gap: 13, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#48505a', alignItems: 'flex-start' }, cruiseFeatureTitle: { color: '#fff', fontFamily: 'TecBodyBold', fontSize: 14 }, cruiseFeatureText: { color: '#929dac', fontFamily: 'TecBody', fontSize: 12, lineHeight: 18, marginTop: 3, paddingRight: 24 }, comingSoonBadge: { marginTop: 26, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 8, backgroundColor: '#4e0000', borderWidth: 1, borderColor: '#737b85' }, comingSoonText: { color: '#fff', fontFamily: 'TecBodyBold', fontSize: 12, letterSpacing: 1.8 }, cruiseNote: { color: '#737d89', fontFamily: 'TecBody', fontSize: 11, textAlign: 'center', marginTop: 14 },
  tabbar: { minHeight: 56, flexDirection: 'row', paddingHorizontal: 3, paddingVertical: 3, marginHorizontal: 4, marginTop: 4, marginBottom: 4, borderTopWidth: 1, borderTopColor: '#888886', borderRadius: 4, overflow: 'hidden', shadowColor: '#000', shadowOpacity: .95, shadowRadius: 15, shadowOffset: { width: 0, height: 8 }, elevation: 14 }, tabbarShine: { position: 'absolute', top: 1, left: 18, right: 18, height: 1, backgroundColor: 'rgba(255,255,255,.28)' }, tab: { flex: 1, minWidth: 0, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 4, paddingHorizontal: 1, overflow: 'hidden' }, tabActiveMetal: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: 4 }, tabActiveShine: { position: 'absolute', top: 1, left: 7, right: 7, height: 1, backgroundColor: 'rgba(255,205,210,.72)' }, tabLabel: { color: '#9da4ad', fontFamily: 'TecBodyBold', fontSize: 10, letterSpacing: .15, marginTop: 3, textAlign: 'center' }, tabLabelOn: { color: '#fff' },
  testEventCard: { width: 328, height: 430, marginRight: 14, borderWidth: 1, borderColor: '#59616b', borderRadius: 14, overflow: 'hidden', backgroundColor: '#0d1014', shadowColor: '#000', shadowOpacity: .9, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 10 }, testEventFlyer: { width: '100%', height: 184, backgroundColor: '#15191e' }, testDateBadge: { position: 'absolute', top: 10, left: 10, width: 52, backgroundColor: 'rgba(5,6,8,.94)', borderTopWidth: 3, borderTopColor: '#7a828c', paddingVertical: 5, alignItems: 'center' }, testEventCopy: { flex: 1, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 13 }, testEventMetalRule: { position: 'absolute', top: 0, left: 0, right: 0, height: 2 }, testEventTitle: { color: '#fff', fontFamily: 'TecBodyBold', fontSize: 17, lineHeight: 22, marginTop: 5 }, testEventTime: { color: '#c8ccd1', fontFamily: 'TecBodyBold', fontSize: 13, marginTop: 9 }, testEventVenue: { color: '#fff', fontFamily: 'TecBodyBold', fontSize: 13, lineHeight: 18, marginTop: 9 }, testEventAddress: { color: '#9ba2aa', fontFamily: 'TecBody', fontSize: 12, lineHeight: 17, marginTop: 3 }, testEventFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }, testEventAction: { overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 5, borderWidth: 1, borderColor: '#737b85' },
  modalSafe: { flex: 1, backgroundColor: COLORS.black }, modalHero: { width: '100%', height: 280, backgroundColor: COLORS.panel }, modalClose: { position: 'absolute', top: Platform.OS === 'ios' ? 18 : 34, right: 16, backgroundColor: 'rgba(5,6,8,.9)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4 }, modalCloseText: { color: COLORS.white, fontSize: 9, fontFamily: 'TecBodyBold', letterSpacing: .7 }, modalBody: { padding: 20, paddingBottom: 45 }, modalTitle: { color: COLORS.white, fontSize: 19, fontFamily: 'TecDisplay', lineHeight: 27, marginTop: 5 }, modalMeta: { color: COLORS.silver, fontSize: 12, marginTop: 5, fontFamily: 'TecBodyBold' }, modalText: { color: COLORS.silver, fontSize: 13, lineHeight: 20, marginTop: 16 }, venueBox: { backgroundColor: COLORS.panel, borderLeftWidth: 3, borderLeftColor: '#737b85', padding: 13, marginTop: 16 }, venueName: { color: COLORS.white, fontFamily: 'TecBodyBold', fontSize: 14 }, modalHeading: { color: COLORS.white, fontSize: 14, fontFamily: 'TecDisplay', marginTop: 24, marginBottom: 11 }, planRow: { flexDirection: 'row', gap: 6 }, planButton: { flex: 1, minWidth: 0, minHeight: 44, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }, planButtonOn: { backgroundColor: COLORS.redDark, borderColor: COLORS.red }, planButtonText: { color: COLORS.white, fontSize: 8, fontFamily: 'TecBodyBold', textAlign: 'center', letterSpacing: .25 }, stop: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.line, paddingVertical: 4 }, stopTime: { width: 64,flexDirection:'row',alignItems:'baseline',gap:2 }, stopHour: { color: COLORS.white, fontFamily: 'TecBodyBold', fontSize: 17 }, stopMeridiem: { color: COLORS.red, fontFamily: 'TecBodyBold', fontSize: 8 }, stopCopy: { flex: 1 }, stopTitle: { color: COLORS.white, fontFamily: 'TecBodyBold', fontSize: 14 }, stopDescription: { color: COLORS.muted, fontSize: 12, lineHeight: 18, marginTop: 3 }
});
const finish = StyleSheet.create({
  welcome: {flexGrow:1, alignItems:'center', justifyContent:'space-evenly', backgroundColor:COLORS.black, paddingVertical:14},
  brand: {width:'90%',height:104},
  kicker: {fontFamily:'TecDisplay',fontSize:13,letterSpacing:1,color:COLORS.silver, textAlign:'center'},
  heroText: {fontFamily:'sans-serif-condensed',fontWeight:'bold',fontStyle:'italic',fontSize:23,color:COLORS.white},
  actions: {width:'100%',paddingHorizontal:22,gap:12,alignItems:'center'},
  ticket: {backgroundColor:'#141517',borderColor:'#92918e',borderWidth:1,borderRadius:8,flexDirection:'row',alignItems:'center',padding:9,gap:8,marginRight:12},
  date: {width:29,alignItems:'center'},
  flyerThumb: {width:'27%',height:132,backgroundColor:'#09090a',borderRadius:4},
  ticketBody:{flex:1,minWidth:0,gap:1},
  ticketButton:{alignSelf:'stretch',alignItems:'center',padding:5,marginTop:4,borderRadius:4,borderWidth:1,borderColor:'#ad3941'},
  caption:{textAlign:'center',color:COLORS.silver,fontSize:11,padding:3,fontStyle:'italic'},
  back:{alignSelf:'flex-start',padding:16},
  form:{gap:8,paddingTop:18},
  spec:{borderBottomWidth:StyleSheet.hairlineWidth,borderColor:'#656565',paddingVertical:3,flexDirection:'row',alignItems:'flex-start',gap:10}
});

const look = StyleSheet.create({
  photoTile:{overflow:'hidden',borderRadius:4,borderWidth:1,borderColor:'#84847e',backgroundColor:'#0c0c0c'},
  photo:{width:'100%',height:'100%',position:'absolute'},
  welcomeSafe:{flex:1,backgroundColor:'#000'},
  welcomeFrame:{flex:1,alignItems:'center',justifyContent:'center',overflow:'hidden'},
  preview:{paddingVertical:9,alignItems:'center'},
  header:{backgroundColor:'#0a0a0a',marginHorizontal:12,paddingVertical:9,alignItems:'center',borderBottomWidth:1,borderBottomColor:'#999995'},
  brandPress:{alignSelf:'stretch',alignItems:'center',justifyContent:'center',minHeight:44},
  brandName:{color:'#eee',fontSize:20,letterSpacing:.4,fontFamily:'TecBodyBold',transform:[{skewX:'-12deg'},{scaleX:1.06}]},
  motto:{fontFamily:'TecBodyBold',fontSize:19,letterSpacing:.8,color:'#e4e4e0',textAlign:'center',transform:[{skewX:'-12deg'}],marginVertical:18},
  smallMotto:{fontSize:13,letterSpacing:1.1,marginVertical:0},
  homeLink:{minHeight:68,marginTop:12,flexDirection:'row',alignItems:'center',gap:15,paddingHorizontal:18,borderWidth:1,borderColor:'#a6a6a1',borderRadius:9,overflow:'hidden'},
  linkLabel:{flex:1,fontFamily:'TecBodyBold',textTransform:'uppercase',fontSize:17,letterSpacing:.5,color:'#e3e4df',transform:[{skewX:'-10deg'}]},
  infoRow:{flexDirection:'row',alignItems:'center',gap:4,marginTop:3},
  detail:{flex:1,marginTop:0,fontSize:12},
  title:{fontFamily:'TecBodyBold',transform:[{skewX:'-8deg'}],fontSize:16,lineHeight:19,color:'#fff'},
  subheading:{fontFamily:'TecBodyBold',fontSize:15,textTransform:'uppercase',transform:[{skewX:'-10deg'}],color:'#eee',marginBottom:4,marginTop:7},
  logistics:{marginHorizontal:12,marginVertical:7,borderWidth:1,borderColor:'#888884',borderRadius:7,backgroundColor:'#131313',padding:12}
});

const metal=StyleSheet.create({
  page:{width:'100%',maxWidth:600,alignSelf:'center',paddingHorizontal:12,paddingTop:3,paddingBottom:14},
  header:{width:'96%',maxWidth:570,alignSelf:'center',minHeight:44,justifyContent:'center',backgroundColor:'#090909'},
  homeHeader:{marginHorizontal:-12},
  greeting:{color:'#efefeb',fontFamily:'TecBodyBold',fontStyle:'italic',textAlign:'center',fontSize:24,marginVertical:12},
  motto:{alignSelf:'center',width:'92%',marginTop:12,marginBottom:4},
  garageShortcut:{alignSelf:'center',width:'99%',marginTop:7},
  ticket:{borderRadius:8,borderWidth:1,borderColor:'#a7a7a2',overflow:'hidden',flexDirection:'row',alignItems:'center',padding:8,gap:7},
  rsvpTouch:{flex:1,minHeight:44,justifyContent:'center'},
  rsvpFace:{minHeight:28,borderWidth:1,borderColor:'#8c8c88',borderRadius:5,alignItems:'center',justifyContent:'center'},
  rsvpText:{fontFamily:'TecBodyBold',fontStyle:'italic',fontSize:11,color:'#f1f1ed'},
  date:{width:'12%',alignItems:'center',gap:1},dateText:{fontSize:13,color:'#e6e6e0',fontFamily:'TecBodyBold'},
  day:{fontSize:31,color:'#dddcd8',fontFamily:'TecBodyBold',lineHeight:35},
  poster:{backgroundColor:'#101010',borderColor:'#777774',borderWidth:1,borderRadius:4,overflow:'hidden'},
  copy:{flex:1,minWidth:0,gap:2},eventName:{fontFamily:'TecBodyBold',fontStyle:'italic',fontSize:16,lineHeight:19,color:'#fff'},
  meta:{fontFamily:'TecBody',fontStyle:'italic',fontSize:12,lineHeight:15,color:'#e6e6e3'},
  address:{fontSize:11,lineHeight:13,color:'#d2d2ce',fontStyle:'italic'},
  perks:{alignSelf:'center',minHeight:44,flexDirection:'row',alignItems:'center',gap:7},
  perksText:{fontSize:12,color:'#bebeb9',fontFamily:'TecBodyBold'},
  nav:{flexDirection:'row',alignSelf:'center',width:'100%',maxWidth:600,height:54,backgroundColor:'#111'},
  subtitle:{color:'#d8d8d3',fontSize:14,fontStyle:'italic',textAlign:'center',marginBottom:8},
  detailFlyer:{width:'94%',height:192,alignSelf:'center',backgroundColor:'#0c0c0b',borderWidth:1,borderColor:'#8e8d88',borderRadius:6}
});
