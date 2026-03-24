import {
  memo, useEffect, useLayoutEffect, useRef, useState,
} from '../../lib/teact/teact';
import { getActions, withGlobal } from '../../global';

import type { GlobalState } from '../../global/types';

import { DEBUG, STRICTERDOM_ENABLED } from '../../config';
import { normalizeWaveUsername, signInWithPassword, signUpWithProfile } from '../../api/wave/auth';
import { disableStrict, enableStrict } from '../../lib/fasterdom/stricterdom';
import { selectSharedSettings } from '../../global/selectors/sharedState';
import buildClassName from '../../util/buildClassName';
import { oldSetLanguage } from '../../util/oldLangProvider';
import { LOCAL_TGS_URLS } from '../common/helpers/animatedAssets';
import { navigateBack } from './helpers/backNavigation';
import { getSuggestedLanguage } from './helpers/getSuggestedLanguage';

import useAsync from '../../hooks/useAsync';
import useFlag from '../../hooks/useFlag';
import useLang from '../../hooks/useLang';
import useLangString from '../../hooks/useLangString';
import useLastCallback from '../../hooks/useLastCallback';
import useMediaTransitionDeprecated from '../../hooks/useMediaTransitionDeprecated';
import useMultiaccountInfo from '../../hooks/useMultiaccountInfo';

import AnimatedIcon from '../common/AnimatedIcon';
import Button from '../ui/Button';
import InputText from '../ui/InputText';
import Loading from '../ui/Loading';

import blankUrl from '../../assets/blank.png';

type StateProps = {
  auth: GlobalState['auth'];
  connectionState: GlobalState['connectionState'];
  language?: string;
};

const DATA_PREFIX = 'wave://auth?code=';
const QR_SIZE = 280;
const QR_PLANE_SIZE = 54;
const QR_CODE_MUTATION_DURATION = 50; // The library is asynchronous and we need to wait for its mutation code
const WAVE_QR_ROTATION_MS = 30_000;

let qrCodeStylingPromise: Promise<typeof import('qr-code-styling')> | undefined;

function ensureQrCodeStyling() {
  if (!qrCodeStylingPromise) {
    qrCodeStylingPromise = import('qr-code-styling');
  }
  return qrCodeStylingPromise;
}

const AuthCode = ({
  connectionState,
  auth,
  language,
}: StateProps) => {
  const {
    returnToAuthPhoneNumber,
    setSharedSettingOption,
    loginWithPasskey,
    devSkipLogin,
    completeWaveAuth,
    showNotification,
  } = getActions();

  const { state, passkeyOption } = auth;

  const suggestedLanguage = getSuggestedLanguage();
  const lang = useLang();
  const qrCodeRef = useRef<HTMLDivElement>();

  const isConnected = connectionState === 'connectionStateReady';
  const continueText = useLangString('AuthContinueOnThisLanguage', suggestedLanguage);
  const [isLoading, markIsLoading, unmarkIsLoading] = useFlag();
  const [isQrMounted, markQrMounted, unmarkQrMounted] = useFlag();
  const [isSubmitting, markIsSubmitting, unmarkIsSubmitting] = useFlag();
  const [authScreen, setAuthScreen] = useState<'login' | 'signup'>('login');
  const [signupStep, setSignupStep] = useState<'credentials' | 'profile'>('credentials');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | undefined>();
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | undefined>();
  const [authError, setAuthError] = useState<string | undefined>();
  const [waveCode, setWaveCode] = useState('');
  const [wavePayload, setWavePayload] = useState('');

  const accountsInfo = useMultiaccountInfo();
  const hasActiveAccount = Object.values(accountsInfo).length > 0;

  const { result: qrCode } = useAsync(async () => {
    const QrCodeStyling = (await ensureQrCodeStyling()).default;
    return new QrCodeStyling({
      width: QR_SIZE,
      height: QR_SIZE,
      image: blankUrl,
      margin: 10,
      type: 'svg',
      dotsOptions: {
        type: 'rounded',
      },
      cornersSquareOptions: {
        type: 'extra-rounded',
      },
      imageOptions: {
        imageSize: 0.4,
        margin: 8,
      },
      qrOptions: {
        errorCorrectionLevel: 'M',
      },
    });
  }, []);

  const transitionClassNames = useMediaTransitionDeprecated(isQrMounted);

  const generateWaveCode = useLastCallback(() => {
    const randomCode = globalThis.crypto?.randomUUID
      ? globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase()
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`.toUpperCase();

    const payload = `${DATA_PREFIX}${randomCode}&ts=${Date.now()}`;

    setWaveCode(randomCode);
    setWavePayload(payload);
  });

  useEffect(() => {
    generateWaveCode();

    const interval = window.setInterval(() => {
      generateWaveCode();
    }, WAVE_QR_ROTATION_MS);

    return () => {
      clearInterval(interval);
    };
  }, [generateWaveCode]);

  useLayoutEffect(() => {
    if (!wavePayload || !qrCode) {
      return () => {
        unmarkQrMounted();
      };
    }

    if (!isConnected) {
      return undefined;
    }

    const container = qrCodeRef.current!;

    if (STRICTERDOM_ENABLED) {
      disableStrict();
    }

    qrCode.update({
      data: wavePayload,
    });

    if (!isQrMounted) {
      qrCode.append(container);
      markQrMounted();
    }

    if (STRICTERDOM_ENABLED) {
      setTimeout(() => {
        enableStrict();
      }, QR_CODE_MUTATION_DURATION);
    }

    return undefined;
  }, [isConnected, wavePayload, isQrMounted, qrCode]);

  const handleBackNavigation = useLastCallback(() => {
    navigateBack();
  });

  const handleLangChange = useLastCallback(() => {
    markIsLoading();

    void oldSetLanguage(suggestedLanguage, () => {
      unmarkIsLoading();

      setSharedSettingOption({ language: suggestedLanguage });
    });
  });

  const handleReturnToAuthPhoneNumber = useLastCallback(() => {
    returnToAuthPhoneNumber();
  });

  const handleLoginWithPasskey = useLastCallback(() => {
    loginWithPasskey();
  });

  const handleDevSkipLogin = useLastCallback(() => {
    devSkipLogin();
  });

  const handleEmailChange = useLastCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value.trim());
    if (authError) {
      setAuthError(undefined);
    }
  });

  const handlePasswordChange = useLastCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (authError) {
      setAuthError(undefined);
    }
  });

  const handleConfirmPasswordChange = useLastCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);
    if (authError) {
      setAuthError(undefined);
    }
  });

  const handleUsernameChange = useLastCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(normalizeWaveUsername(e.target.value));
    if (authError) {
      setAuthError(undefined);
    }
  });

  const handleDisplayNameChange = useLastCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayName(e.target.value);
    if (authError) {
      setAuthError(undefined);
    }
  });

  const handleAvatarFileChange = useLastCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    setAvatarFile(selected);

    if (selected) {
      const nextUrl = URL.createObjectURL(selected);
      setAvatarPreviewUrl((prev) => {
        if (prev) {
          URL.revokeObjectURL(prev);
        }
        return nextUrl;
      });
    } else {
      setAvatarPreviewUrl((prev) => {
        if (prev) {
          URL.revokeObjectURL(prev);
        }
        return undefined;
      });
    }

    if (authError) {
      setAuthError(undefined);
    }
  });

  const handleSubmitWaveAuth = useLastCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const isSignUpScreen = authScreen === 'signup';

    if (!email || !password || isSubmitting) {
      return;
    }

    if (isSignUpScreen && password !== confirmPassword) {
      const message = 'Passwords do not match';
      setAuthError(message);
      showNotification({
        message,
      });
      return;
    }

    if (isSignUpScreen && signupStep === 'credentials') {
      setSignupStep('profile');
      return;
    }

    if (isSignUpScreen && signupStep === 'profile') {
      const normalizedUsername = normalizeWaveUsername(username);
      const trimmedDisplayName = displayName.trim();

      if (!normalizedUsername) {
        const message = 'Username is required';
        setAuthError(message);
        showNotification({ message });
        return;
      }

      if (!trimmedDisplayName) {
        const message = 'Visible name is required';
        setAuthError(message);
        showNotification({ message });
        return;
      }
    }

    markIsSubmitting();
    setAuthError(undefined);

    try {
      const result = isSignUpScreen
        ? await signUpWithProfile({
          email,
          password,
          username,
          displayName,
          avatarFile,
        })
        : await signInWithPassword(email, password);

      completeWaveAuth({
        userId: result.user.id,
        email: result.user.email || email,
      });
    } catch (err: any) {
      const message = err?.message || 'Unable to authenticate with Wave backend';
      setAuthError(message);
      showNotification({
        message,
      });
    } finally {
      unmarkIsSubmitting();
    }
  });

  const switchToLogin = useLastCallback(() => {
    setAuthScreen('login');
    setSignupStep('credentials');
    setUsername('');
    setDisplayName('');
    setAvatarFile(undefined);
    setAvatarPreviewUrl((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return undefined;
    });
    setConfirmPassword('');
    setAuthError(undefined);
  });

  const switchToSignup = useLastCallback(() => {
    setAuthScreen('signup');
    setSignupStep('credentials');
    setUsername('');
    setDisplayName('');
    setAvatarFile(undefined);
    setAvatarPreviewUrl((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return undefined;
    });
    setAuthError(undefined);
  });

  const handleBackToCredentials = useLastCallback(() => {
    setSignupStep('credentials');
    setAuthError(undefined);
  });

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  const isAuthReady = state === 'authorizationStateWaitQrCode';
  const isSignUpScreen = authScreen === 'signup';
  const isProfileStep = isSignUpScreen && signupStep === 'profile';

  return (
    <div id="auth-qr-form" className="custom-scroll">
      {hasActiveAccount && (
        <Button
          size="smaller"
          round
          color="translucent"
          className="auth-close"
          iconName="close"
          onClick={handleBackNavigation}
        />
      )}
      <div className="auth-form qr">
        <div className="qr-outer">
          <div
            className={buildClassName('qr-inner', transitionClassNames)}
            key="qr-inner"
          >
            <div
              key="qr-container"
              className="qr-container"
              ref={qrCodeRef}
              style={`width: ${QR_SIZE}px; height: ${QR_SIZE}px`}
            />
            <AnimatedIcon
              tgsUrl={LOCAL_TGS_URLS.QrPlane}
              size={QR_PLANE_SIZE}
              className="qr-plane"
              nonInteractive
              noLoop={false}
            />
          </div>
          {!isQrMounted && <div className="qr-loading"><Loading /></div>}
        </div>
        <h1>{lang('LoginQRTitle')}</h1>
        <ol>
          <li><span>{lang('LoginQRHelp1')}</span></li>
          <li><span>{lang('LoginQRHelp2', undefined, { withNodes: true, withMarkdown: true })}</span></li>
          <li><span>{lang('LoginQRHelp3')}</span></li>
        </ol>
        <p className="wave-auth-code">Wave auth code: {waveCode || 'Generating...'}</p>

        <div className="wave-auth-switch" role="tablist" aria-label="Wave auth mode">
          <Button
            className="auth-button"
            color={isSignUpScreen ? 'gray' : 'primary'}
            onClick={switchToLogin}
          >
            Login
          </Button>
          <Button
            className="auth-button"
            color={isSignUpScreen ? 'primary' : 'gray'}
            onClick={switchToSignup}
          >
            Signup
          </Button>
        </div>

        <form className={buildClassName('wave-auth-form', isProfileStep && 'profile-step')} onSubmit={handleSubmitWaveAuth}>
          {!isProfileStep && (
            <>
              <h2>{isSignUpScreen ? 'Create your Wave account' : 'Login to Wave'}</h2>
              <InputText
                id="wave-auth-email"
                label="Email"
                value={email}
                inputMode="email"
                autoComplete="email"
                onChange={handleEmailChange}
              />
              <InputText
                id="wave-auth-password"
                label={authError || 'Password'}
                value={password}
                autoComplete={isSignUpScreen ? 'new-password' : 'current-password'}
                onChange={handlePasswordChange}
              />

              {isSignUpScreen && (
                <InputText
                  id="wave-auth-confirm-password"
                  label="Confirm password"
                  value={confirmPassword}
                  autoComplete="new-password"
                  onChange={handleConfirmPasswordChange}
                />
              )}

              <Button className="auth-button" type="submit" isLoading={isSubmitting}>
                {isSignUpScreen ? 'Continue' : 'Sign in with Wave'}
              </Button>
            </>
          )}

          {isProfileStep && (
            <>
              <h2>Customize your profile</h2>
              <div className="wave-profile-setup">
                <label className="wave-avatar-picker" htmlFor="wave-auth-avatar">
                  {avatarPreviewUrl
                    ? <img src={avatarPreviewUrl} alt="Avatar preview" className="wave-avatar-preview" />
                    : <span className="wave-avatar-placeholder">Add Photo</span>}
                </label>
                <div className="wave-avatar-caption">
                  This photo helps people recognize you.
                </div>
              </div>

              <InputText
                id="wave-auth-username"
                label="Username"
                value={username}
                autoComplete="username"
                onChange={handleUsernameChange}
              />
              <p className="wave-input-hint">@{username || 'username'}</p>
              <InputText
                id="wave-auth-display-name"
                label="Visible name"
                value={displayName}
                autoComplete="nickname"
                onChange={handleDisplayNameChange}
              />
              <input
                id="wave-auth-avatar"
                className="wave-avatar-input"
                type="file"
                accept="image/*"
                onChange={handleAvatarFileChange}
              />

              <Button className="auth-button" type="submit" isLoading={isSubmitting}>
                Create Wave account
              </Button>
              <Button className="auth-button" isText onClick={handleBackToCredentials}>
                Back
              </Button>
            </>
          )}

          {!isSignUpScreen && (
            <Button className="auth-button" isText onClick={switchToSignup}>
              Need an account? Go to Signup
            </Button>
          )}

          {isSignUpScreen && (
            <Button className="auth-button" isText onClick={switchToLogin}>
              Already have an account? Go to Login
            </Button>
          )}
        </form>

        {isAuthReady && (
          <Button className="auth-button" isText onClick={handleReturnToAuthPhoneNumber}>
            {lang('LoginQRCancel')}
          </Button>
        )}
        {passkeyOption && (
          <Button className="auth-button" isText onClick={handleLoginWithPasskey}>
            {lang('LoginPasskey')}
          </Button>
        )}
        {DEBUG && (
          <Button className="auth-button" isText onClick={handleDevSkipLogin}>
            Skip login (dev)
          </Button>
        )}
        {suggestedLanguage && suggestedLanguage !== language && continueText && (
          <Button className="auth-button" isText isLoading={isLoading} onClick={handleLangChange}>
            {continueText}
          </Button>
        )}
      </div>
    </div>
  );
};

export default memo(withGlobal(
  (global): Complete<StateProps> => {
    const {
      connectionState, auth,
    } = global;

    const { language } = selectSharedSettings(global);

    return {
      connectionState,
      auth,
      language,
    };
  },
)(AuthCode));
