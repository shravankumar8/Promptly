import React from 'react'
import { useSession, useUser } from "@descope/react-sdk";
import { Descope } from "@descope/react-sdk";


  
const Signup = () => {
 const { isAuthenticated, isSessionLoading } = useSession();
  const { user, isUserLoading } = useUser();

  return (
    <>
      {!isAuthenticated && (
        <Descope
          flowId="sign-up-or-in"
          onSuccess={(e) => console.log(e.detail.user)}
          onError={(e) => console.log(e, "Could not log in!")}
        />
      )}

      {(isSessionLoading || isUserLoading) && <p>Loading...</p>}

      {!isUserLoading && isAuthenticated && (
        <>
          <p>Hello {user.name}</p>
          <div>My Private Component</div>
        </>
      )}
    </>
  );
};


  


export default Signup





