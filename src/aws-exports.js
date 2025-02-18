const awsConfig = {
    Storage: {
        AWSS3: {
            bucket: "social-media-automation-daily-tasks",
            region: "us-east-1"
        }
    },
    Auth: {
        mandatorySignIn: false
    }
};

export default awsConfig;
