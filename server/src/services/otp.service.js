import otpGenerator from 'otp-generator';
const generateOtp = () => {
  return otpGenerator.generate(6, { digits:true,
      lowerCaseAlphabets:false,
      upperCaseAlphabets:false,
      specialChars:false
    });
}

const generatePhoneUpdateOtp = () => {
  return otpGenerator.generate(4, {
    digits: true,
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false,
  });
}

export { generateOtp, generatePhoneUpdateOtp };
