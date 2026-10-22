import { useEffect, useState } from "react";
import api from "helpers/apiConfiguration";

// Switched per environment in the API's appsettings, see FeatureOptions.cs
export interface IFeatures {
  invitationCode: boolean;
  rawData: boolean;
}

const allOff: IFeatures = { invitationCode: false, rawData: false };

// asked once per page load; without a server (e.g. on-device) all are off
let request: Promise<IFeatures> | undefined;
const loadFeatures = () =>
  (request ??= api
    .get<IFeatures>("features")
    .then(({ data }) => data)
    .catch(() => allOff));

// undefined until the server answered
const useFeatures = () => {
  const [features, setFeatures] = useState<IFeatures>();

  useEffect(() => {
    let isMounted = true;
    loadFeatures().then((f) => isMounted && setFeatures(f));
    return () => {
      isMounted = false;
    };
  }, []);

  return features;
};

export default useFeatures;
