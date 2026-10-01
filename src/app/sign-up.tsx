import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AuthField, AuthLayout, StatePicker } from '@/components/AuthLayout';
import { Banner, Button, Check, T, success } from '@/components/ui';
import { C } from '@/constants/theme';
import { authErrorMessage, useAuth } from '@/context/AuthContext';
import {
  MIN_AGE,
  formatDobInput,
  formatPhoneInput,
  isEmail,
  isUsername,
  parseDob,
  passwordProblem,
  phoneToE164,
} from '@/lib/validation';

type Step = 0 | 1 | 2;
const STEPS = [
  { title: 'Create your account', subtitle: 'You’ll log in with your email and password.' },
  { title: 'About you', subtitle: 'Your legal details stay private — only you can see them.' },
  { title: 'Your profile', subtitle: 'This is how friends find and challenge you.' },
];

export default function SignUp() {
  const { signUp, isUsernameAvailable } = useAuth();
  const [step, setStep] = useState<Step>(0);

  // step 1
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  // step 2
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [state, setState] = useState('');
  // step 3
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [certify, setCertify] = useState(false);
  const [terms, setTerms] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = (s: Step): Record<string, string> => {
    const e: Record<string, string> = {};
    if (s === 0) {
      if (!isEmail(email)) e.email = 'Enter a valid email address.';
      const pw = passwordProblem(password);
      if (pw) e.password = pw;
      else if (confirm !== password) e.confirm = 'Passwords don’t match.';
    }
    if (s === 1) {
      if (!first.trim()) e.first = 'Required.';
      if (!last.trim()) e.last = 'Required.';
      const d = parseDob(dob);
      if (!d) e.dob = 'Enter your birthday as MM/DD/YYYY.';
      else if (d.age < MIN_AGE) e.dob = `You must be ${MIN_AGE} or older to use Styx.`;
      if (!phoneToE164(phone)) e.phone = 'Enter a 10-digit US phone number.';
      if (!state) e.state = 'Choose your state.';
    }
    if (s === 2) {
      if (!isUsername(username)) e.username = '2–20 letters, numbers or underscores.';
      if (!displayName.trim()) e.displayName = 'Required.';
      if (!certify) e.certify = 'Required.';
      if (!terms) e.terms = 'Required.';
    }
    return e;
  };

  const next = async () => {
    setFormError('');
    const e = validate(step);
    setErrors(e);
    if (Object.keys(e).length) return;

    if (step === 0) return setStep(1);
    if (step === 1) {
      if (!displayName) setDisplayName(`${first.trim()} ${last.trim()}`);
      return setStep(2);
    }

    // final step → create the account
    try {
      setLoading(true);
      if (!(await isUsernameAvailable(username))) {
        setErrors({ username: `@${username.replace(/^@/, '')} is taken — try another.` });
        return;
      }
      await signUp({
        email,
        password,
        legalFirstName: first,
        legalLastName: last,
        dateOfBirth: parseDob(dob)!.iso,
        phone: phoneToE164(phone)!,
        state,
        username,
        displayName,
      });
      success(); // the router switches into the app automatically
    } catch (err: any) {
      const msg = authErrorMessage(err);
      if (err?.code === 'auth/email-already-in-use' || err?.code === 'auth/invalid-email') {
        setStep(0);
        setErrors({ email: msg });
      } else {
        setFormError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const back = () => {
    setErrors({});
    setFormError('');
    if (step === 0) router.back();
    else setStep((step - 1) as Step);
  };

  return (
    <AuthLayout
      title={STEPS[step].title}
      subtitle={STEPS[step].subtitle}
      onBack={back}
      progress={(step + 1) / 3}
      footer={<Button title={step === 2 ? 'Create account' : 'Continue'} loading={loading} onPress={next} />}>
      {formError ? <Banner text={formError} /> : null}

      {step === 0 ? (
        <>
          <AuthField
            label="Email"
            value={email}
            onChangeText={setEmail}
            error={errors.email}
            placeholder="you@berkeley.edu"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="emailAddress"
            autoComplete="email"
          />
          <AuthField
            label="Password"
            value={password}
            onChangeText={setPassword}
            error={errors.password}
            hint="At least 8 characters, with a letter and a number."
            secure
            textContentType="newPassword"
            autoComplete="new-password"
          />
          <AuthField label="Confirm password" value={confirm} onChangeText={setConfirm} error={errors.confirm} secure textContentType="newPassword" onSubmitEditing={next} />
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <T v="small">Already have an account?</T>
            <Pressable onPress={() => router.replace('/sign-in')} hitSlop={8}>
              <T v="small" style={{ color: C.ink, fontWeight: '700' }}>
                Log in
              </T>
            </Pressable>
          </View>
        </>
      ) : null}

      {step === 1 ? (
        <>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <AuthField label="Legal first name" value={first} onChangeText={setFirst} error={errors.first} textContentType="givenName" autoComplete="given-name" />
            </View>
            <View style={{ flex: 1 }}>
              <AuthField label="Legal last name" value={last} onChangeText={setLast} error={errors.last} textContentType="familyName" autoComplete="family-name" />
            </View>
          </View>
          <AuthField
            label="Date of birth"
            value={dob}
            onChangeText={(t) => setDob(formatDobInput(t))}
            error={errors.dob}
            placeholder="MM/DD/YYYY"
            keyboardType="number-pad"
            textContentType="birthdate"
            autoComplete="birthdate-full"
            maxLength={10}
          />
          <AuthField
            label="Mobile number"
            value={phone}
            onChangeText={(t) => setPhone(formatPhoneInput(t))}
            error={errors.phone}
            placeholder="(510) 555-1234"
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            autoComplete="tel"
          />
          <StatePicker value={state} onChange={setState} error={errors.state} />
        </>
      ) : null}

      {step === 2 ? (
        <>
          <AuthField
            label="Username"
            value={username}
            onChangeText={(t) => setUsername(t.replace(/^@/, '').replace(/\s/g, ''))}
            error={errors.username}
            hint="Friends search for you by this."
            placeholder="levi"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="username"
            autoComplete="username-new"
            maxLength={20}
          />
          <AuthField label="Display name" value={displayName} onChangeText={setDisplayName} error={errors.displayName} hint="Shown on your bets. Can be a nickname." />
          <View style={{ gap: 14, marginTop: 4 }}>
            <Check checked={certify} onToggle={() => setCertify(!certify)} label={`I’m ${MIN_AGE} or older and the information I entered is accurate.`} />
            {errors.certify ? <T v="tiny" style={{ color: C.red }}>Please confirm this to continue.</T> : null}
            <Check checked={terms} onToggle={() => setTerms(!terms)} label="I agree to the Styx Terms of Service and Privacy Policy." />
            {errors.terms ? <T v="tiny" style={{ color: C.red }}>Please agree to continue.</T> : null}
          </View>
          <T v="tiny">New accounts start with $100 in play money.</T>
        </>
      ) : null}
    </AuthLayout>
  );
}
