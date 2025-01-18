import React, { useState } from 'react'
import '../css/Login.css'
import { useNavigate } from 'react-router-dom';

const Login = ({isSignup}) => {
    const [formData,setFormData] = useState({
        name : '',
        email : '',
        password : '',
    })
    const [loding,setLoading] = useState(false)
    const navigator = useNavigate()

    const handleChange = (e) => {
        const {id,value} = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [id]:value,
        }));
    };


    const handleSubmit = async(e) => {
        e.preventDefault()
        const {name,email,password} = formData

        if(isSignup && ( !name || !email || !password)){
            return alert('please enter all field')
        }

        if(!isSignup && (!email || !password)){
            return alert('please enter all field in login Page')
        }
        try{
            setLoading(true)
            const res = await fetch(`http://localhost:4000/api/${isSignup ? 'register' : 'login'}`,{
                method:'POST',
                headers:{
                    'content-type' : 'application/json'
                },
                body : JSON.stringify(formData)
            });

            setLoading(false)
            const resData = await res.json();
            if(res.ok){
                console.log('response data : ',await resData);
                localStorage.setItem('jwt_token',resData.token)               
                localStorage.setItem('user_details',JSON.stringify(resData.user))               
                navigator('/')
            }else{
                console.error(resData.message || "something went wrong"); 
            }

        }catch(error){
            setLoading(false)
            console.error("there is a error",error);
            alert('something went wrong please try again later')
        }

    }
    



  return (
    <div className='LoginPage'>
        <form className='Login-form'onSubmit={handleSubmit}>
            <h1>{isSignup ? 'Signup here' : 'Login here'}</h1>
            {isSignup && (<div className="login-section">
                <label htmlFor="name">Full Name</label>
                <input type="text" id='name' className='basic-input' value={formData.name} onChange={handleChange} aria-label='Enter Your Name' required={!isSignup} />
            </div>)}    
            <div className="login-section">
                <label htmlFor="email">Email</label>
                <input type='email' id='email' className='basic-input' value={formData.email} onChange={handleChange} aria-label='Email' required />
            </div>
            <div className="login-section">
                <label htmlFor="password">Password</label>
                <input type='password' id='password' className='basic-input' value={formData.password} onChange={handleChange} aria-label='password' required />
            </div>

            <button type='submit' className='login-button' disabled = {loding}>{loding ? 'Loading...' : isSignup ? 'SIGNUP' : 'LOGIN'}</button>

            <p className='toggle-text'>{isSignup ? 'Already Have a account ? ' : "Don't have a account ?"} <span className='login-text' onClick={() => navigator(isSignup ? '/user/login' : '/user/signup')}>{isSignup ? 'Login' : 'SignUp'}</span></p>
        </form> 
    </div>
    
  )
}

export default Login